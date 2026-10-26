import { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, safeStorage, shell } from 'electron';
import spawn from 'cross-spawn';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creaPonte, login, nuovoCodice, formattaCodice } from '@ponte-ai/core/ponte.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const NOME_APP = 'Ponte AI';
const fileConfig = () => join(app.getPath('userData'), 'config.json');

if (!app.requestSingleInstanceLock()) app.quit();

// ---- configurazione: piu' connessioni (una per server/progetto).
// La password e cifrata con il sistema (Windows); dove non si puo, resta in chiaro con permessi 0600.
let cfg = { connessioni: [], avvioAuto: true, codice: '' };
try {
  const letto = JSON.parse(readFileSync(fileConfig(), 'utf8'));
  cfg = { ...cfg, ...letto };
  // Versione 0.1: una sola connessione nei campi piatti.
  if (letto.server && letto.utente && !letto.connessioni) {
    cfg.connessioni = [{ id: randomUUID(), nome: 'Server', server: letto.server, utente: letto.utente, password: letto.password, acceso: letto.acceso !== false }];
  }
} catch { /* prima volta */ }
const salva = () => writeFileSync(fileConfig(), JSON.stringify({ connessioni: cfg.connessioni, avvioAuto: cfg.avvioAuto, codice: cfg.codice }), { mode: 0o600 });
// Codice di abbinamento: uno per installazione, fisso. Il server instrada le chat per utente + codice.
if (!cfg.codice) { cfg.codice = nuovoCodice(); try { salva(); } catch { /* si riprova al prossimo salvataggio */ } }
// Senza portachiavi (es. Linux/WSL) la password resta in chiaro nel file, leggibile solo dal tuo utente (0600).
const cifra = (p) => (safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(p).toString('base64') : `chiaro:${Buffer.from(p).toString('base64')}`);
const decifra = (c) => {
  try {
    if (c.password.startsWith('chiaro:')) return Buffer.from(c.password.slice(7), 'base64').toString();
    return safeStorage.decryptString(Buffer.from(c.password, 'base64'));
  } catch { return ''; }
};

/**
 * Elenco opzionale preparato dall'IT: un file `server.json` con `[{ "nome": "...", "server": "http://..." }]`.
 * Si cerca accanto all'app, poi in ProgramData. Serve solo a precompilare il modulo.
 */
function serverDellIT() {
  const percorsi = [join(dirname(app.getPath('exe')), 'server.json'), join(process.env.ProgramData ?? '', 'PonteAI', 'server.json'), join(aqui, 'server.json')];
  for (const p of percorsi) {
    try {
      if (!existsSync(p)) continue;
      const v = JSON.parse(readFileSync(p, 'utf8'));
      if (Array.isArray(v)) return v.filter((x) => x && typeof x.nome === 'string' && typeof x.server === 'string');
    } catch { /* file illeggibile: lo si ignora */ }
  }
  return [];
}

// ---- stato mostrato all'utente
let claude = { stato: 'controllo' }; // controllo | assente | nonAccesso | ok
const live = new Map(); // id connessione -> { ponte, conn: {stato, dettaglio}, inUso }
let win = null;
let tray = null;
let uscita = false;

const statoConn = (c) => {
  const l = live.get(c.id);
  return { id: c.id, nome: c.nome, server: c.server, utente: c.utente, acceso: c.acceso, stato: l?.conn.stato ?? 'spento', dettaglio: l?.conn.dettaglio ?? '', inUso: l?.inUso ?? 0 };
};
const stato = () => ({ connessioni: cfg.connessioni.map(statoConn), avvioAuto: cfg.avvioAuto, codice: formattaCodice(cfg.codice), claude, serverIT: serverDellIT() });

function aggiorna() {
  win?.webContents.send('stato', stato());
  if (!tray) return;
  const cs = cfg.connessioni.map(statoConn);
  const accese = cs.filter((c) => c.acceso);
  const ok = accese.filter((c) => c.stato === 'connesso').length;
  const riassunto = !accese.length ? 'Spento' : ok === accese.length ? 'Tutto collegato' : ok ? `${ok} di ${accese.length} collegati` : 'Non collegato';
  tray.setToolTip(`${NOME_APP} - ${riassunto}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: riassunto, enabled: false },
    { label: 'Apri', click: mostra },
    ...cs.map((c) => ({ label: `${c.acceso ? 'Spegni' : 'Accendi'}: ${c.nome}`, click: () => accendi(c.id, !c.acceso) })),
    { type: 'separator' },
    { label: 'Esci', click: () => { uscita = true; fermaTutti(); app.exit(0); } },
  ]));
}

// ---- Claude Code sul PC
function esegui(args) {
  return new Promise((ok) => {
    const c = spawn('claude', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => { out += d; });
    c.on('error', (e) => ok({ codice: e.code === 'ENOENT' ? 'ENOENT' : 'errore', out }));
    c.on('close', (codice) => ok({ codice, out }));
  });
}
async function controllaClaude() {
  const v = await esegui(['--version']);
  if (v.codice === 'ENOENT') claude = { stato: 'assente' };
  else {
    const a = await esegui(['auth', 'status']);
    let loggato = false;
    try { loggato = JSON.parse(a.out).loggedIn === true; } catch { /* non JSON: non collegato */ }
    claude = { stato: loggato ? 'ok' : 'nonAccesso' };
  }
  aggiorna();
}

// ---- ponti
function ferma(id) { live.get(id)?.ponte.stop(); live.delete(id); }
function fermaTutti() { for (const id of [...live.keys()]) ferma(id); }
function avvia(c) {
  ferma(c.id);
  if (!c.acceso) return aggiorna();
  const l = { ponte: null, conn: { stato: 'connessione', dettaglio: '' }, inUso: 0 };
  live.set(c.id, l);
  l.ponte = creaPonte({
    server: c.server,
    code: cfg.codice,
    getToken: () => login(c.server, c.utente, decifra(c)),
    onStato: (s, d) => { l.conn = { stato: s === 'connesso' ? 'connesso' : s === 'errore' ? 'errore' : 'connessione', dettaglio: d ?? '' }; aggiorna(); },
    onRun: (n) => { l.inUso = n; aggiorna(); },
  });
  aggiorna();
}
function accendi(id, on) {
  const c = cfg.connessioni.find((x) => x.id === id);
  if (!c) return;
  c.acceso = on; salva(); avvia(c);
}

// ---- finestra e icona
function mostra() {
  if (!win) {
    win = new BrowserWindow({
      width: 460, height: 700, minWidth: 420, autoHideMenuBar: true, title: NOME_APP, icon: join(aqui, 'icon.png'),
      webPreferences: { preload: join(aqui, 'preload.cjs'), contextIsolation: true, sandbox: true },
    });
    win.loadFile(join(aqui, 'ui', 'index.html'));
    // Chiudere la finestra non spegne i ponti: restano nella barra.
    win.on('close', (e) => { if (!uscita) { e.preventDefault(); win.hide(); } });
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  }
  win.show();
  win.focus();
}

ipcMain.handle('stato', () => stato());
ipcMain.handle('ricontrolla', () => controllaClaude());
ipcMain.handle('aggiungi', async (_e, { nome, server, utente, password }) => {
  server = String(server ?? '').trim().replace(/\/$/, '');
  utente = String(utente ?? '').trim();
  if (!/^https?:\/\//i.test(server)) return { errore: "L'indirizzo deve iniziare con http:// o https://" };
  if (cfg.connessioni.some((c) => c.server === server && c.utente === utente)) return { errore: 'Questa connessione esiste già.' };
  try { await login(server, utente, password); } catch (e) { return { errore: e.message }; }
  const cifrata = cifra(password);
  const c = { id: randomUUID(), nome: String(nome ?? '').trim() || server.replace(/^https?:\/\//i, ''), server, utente, password: cifrata, acceso: true };
  cfg.connessioni.push(c);
  salva();
  avvia(c);
  return {};
});
ipcMain.handle('rimuovi', (_e, id) => { ferma(id); cfg.connessioni = cfg.connessioni.filter((c) => c.id !== id); salva(); aggiorna(); });
ipcMain.handle('accendi', (_e, id, on) => accendi(id, on));
ipcMain.handle('avvio-auto', (_e, on) => {
  cfg.avvioAuto = on; salva();
  app.setLoginItemSettings({ openAtLogin: on, args: ['--nascosto'] });
  aggiorna();
});
ipcMain.handle('accedi-claude', () => {
  // Apre il login di Claude nel browser; a fine procedura si ricontrolla da solo.
  const c = spawn('claude', ['auth', 'login'], { stdio: 'ignore' });
  c.on('close', () => controllaClaude());
});

app.on('second-instance', mostra);
app.on('before-quit', () => { uscita = true; });
app.on('window-all-closed', () => {}); // resta nella barra

app.whenReady().then(async () => {
  tray = new Tray(nativeImage.createFromPath(join(aqui, 'icon.png')).resize({ width: 16, height: 16 }));
  tray.on('click', mostra);
  app.setLoginItemSettings({ openAtLogin: cfg.avvioAuto, args: ['--nascosto'] });
  await controllaClaude();
  for (const c of cfg.connessioni) avvia(c);
  aggiorna();
  // All'avvio con Windows resta nascosta solo se Claude e' a posto e c'e' almeno una connessione.
  const nascosta = process.argv.includes('--nascosto') && claude.stato === 'ok' && cfg.connessioni.length > 0;
  if (!nascosta) mostra();
});
