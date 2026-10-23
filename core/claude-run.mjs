import spawn from 'cross-spawn';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { creaTraduttore } from './stream-json.mjs';

/** Come ChatService, ma in streaming. Vedi i commenti di chat.service.ts per il perche' di ogni flag. */
export async function avviaClaude(opts) {
  const { sessionId, onEvent } = opts;
  if (!sessionId) return avvia(opts);
  // La sessione puo' non esistere su questo PC (nata sul server o su un altro PC): si riparte da zero.
  let corrente;
  let annullata = false;
  const avviaDi = async (id, filtra) => avvia({ ...opts, sessionId: id, onEvent: filtra });
  corrente = await avviaDi(sessionId, (e) => {
    if (e.type === 'done' && e.isError && !annullata) {
      console.log('[ponte] sessione non trovata su questo PC, riparto senza --resume');
      avviaDi(undefined, onEvent).then((r) => { corrente = r; });
      return;
    }
    onEvent(e);
  });
  return { annulla: () => { annullata = true; corrente.annulla(); } };
}

async function avvia({ prompt, token, mcpUrl, sessionId, onEvent, onClose }) {
  const workDir = await mkdtemp(join(tmpdir(), 'smlbi-bridge-'));
  const configPath = join(workDir, 'mcp-config.json');
  await writeFile(configPath, JSON.stringify({ mcpServers: { smlbi: { type: 'http', url: mcpUrl, headers: { Authorization: `Bearer ${token}` } } } }));
  const args = [
    '-p', prompt.replace(/\s+/g, ' ').trim(),
    '--mcp-config', configPath, '--strict-mcp-config',
    '--allowedTools', 'mcp__smlbi',
    '--permission-mode', 'auto',
    '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
    '--restricted',
  ];
  if (sessionId) args.push('--resume', sessionId);

  const child = spawn('claude', args, { cwd: workDir, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
  const traduci = creaTraduttore();
  let finito = false;
  let stderr = '';
  child.stderr.on('data', (c) => { stderr += c; });
  createInterface({ input: child.stdout }).on('line', (riga) => {
    if (process.env.SMLBI_DEBUG || riga.includes('"type":"result"')) console.log('[claude]', riga.slice(0, 3000));
    for (const e of traduci(riga)) {
      if (e.type === 'done') finito = true;
      onEvent(e);
    }
  });
  const chiudi = async () => { await rm(workDir, { recursive: true, force: true }).catch(() => {}); onClose?.(); };
  child.on('error', async (err) => {
    onEvent({ type: 'error', message: err.code === 'ENOENT' ? 'Comando "claude" non trovato su questo PC' : String(err.message) });
    finito = true;
    await chiudi();
  });
  child.on('close', async (code) => {
    if (!finito) onEvent({ type: 'error', message: `claude terminato (codice ${code}) ${stderr.trim().split('\n').slice(-3).join(' ')}`.trim() });
    await chiudi();
  });

  return { annulla: () => uccidiAlbero(child) };
}

/** Su Windows `child.kill()` non uccide i figli: serve taskkill /T. Altrove il gruppo di processi. */
export function uccidiAlbero(child) {
  if (!child.pid) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); } }
}
