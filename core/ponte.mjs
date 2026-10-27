import { randomBytes } from 'node:crypto';
import { io } from 'socket.io-client';
import { avviaClaude } from './claude-run.mjs';

/**
 * Il ponte come libreria (lo usano la riga di comando e l'app Windows).
 * `getToken` e' richiamata a ogni (ri)connessione: un token scaduto non ferma il ponte.
 * `onStato`: 'connesso' | 'scollegato' | 'errore' (con dettaglio).
 * `onTraffico({ dir: 'in'|'out'|'sys', tipo, runId?, dettaglio?, ms?, errore?, contenuto? })`: una voce per ogni messaggio
 * da/verso il server. `contenuto` (opzionale): prompt, risposta finale o messaggio d'errore, troncato a 4000 caratteri.
 * Il testo in streaming conta come una sola voce per run.
 */
export function creaPonte({ server, code, getToken, log = () => {}, onStato = () => {}, onRun = () => {}, onTraffico = () => {} }) {
  server = server.replace(/\/$/, '');
  const socket = io(`${server}/agent`, {
    auth: (cb) => getToken().then((token) => cb({ token, code }), (e) => { onStato('errore', e.message); cb({ token: '', code }); }),
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  const attive = new Map();
  const t0 = new Map(); // runId -> inizio
  const testoVisto = new Set();
  const MAX_TESTO = 4000;
  const tronca = (t) => { t = String(t ?? ''); return t.length > MAX_TESTO ? `${t.slice(0, MAX_TESTO)}\n… troncato (${t.length} caratteri)` : t; };
  const traffico = (v) => { try { onTraffico({ ts: Date.now(), ...v }); } catch { /* la UI non deve fermare il ponte */ } };
  socket.on('connect', () => { log(`collegato a ${server}`); onStato('connesso'); traffico({ dir: 'sys', tipo: 'collegato' }); });
  socket.on('disconnect', (m) => { log(`scollegato (${m})`); onStato('scollegato', m); traffico({ dir: 'sys', tipo: 'scollegato', dettaglio: m, errore: m !== 'io client disconnect' }); });
  socket.on('connect_error', (e) => { log(`errore di connessione: ${e.message}`); onStato('errore', e.message); traffico({ dir: 'sys', tipo: 'errore connessione', dettaglio: e.message, errore: true }); });
  socket.on('run', async ({ runId, prompt, token, sessionId }) => {
    log(`run ${runId.slice(0, 8)} avviato`);
    onRun(attive.size + 1);
    t0.set(runId, Date.now());
    traffico({ dir: 'in', tipo: 'run', runId, dettaglio: sessionId ? 'sessione ripresa' : 'nuova sessione', contenuto: tronca(prompt) });
    const invia = (event) => {
      socket.emit('event', { runId, event });
      if (event.type === 'text') { if (testoVisto.has(runId)) return; testoVisto.add(runId); traffico({ dir: 'out', tipo: 'risposta in corso', runId }); return; }
      const ms = event.type === 'done' || event.type === 'error' ? Date.now() - (t0.get(runId) ?? Date.now()) : undefined;
      if (ms !== undefined) { t0.delete(runId); testoVisto.delete(runId); }
      traffico({
        dir: 'out', runId, ms,
        contenuto: event.type === 'done' ? tronca(event.reply) : event.type === 'error' ? tronca(event.message) : undefined,
        tipo: event.type === 'tool' ? `strumento ${event.name} ${event.phase === 'start' ? 'avvio' : 'fine'}` : event.type === 'done' ? 'risposta completa' : event.type,
        errore: Boolean(event.isError) || event.type === 'error' || (event.type === 'done' && event.isError),
      });
    };
    try {
      const run = await avviaClaude({
        prompt, token, sessionId, mcpUrl: `${server}/mcp`, onEvent: invia,
        onClose: () => { attive.delete(runId); onRun(attive.size); log(`run ${runId.slice(0, 8)} chiuso`); },
      });
      attive.set(runId, run);
    } catch (e) { invia({ type: 'error', message: String(e.message ?? e) }); }
  });
  socket.on('cancel', ({ runId }) => { traffico({ dir: 'in', tipo: 'cancel', runId }); attive.get(runId)?.annulla(); });
  return { stop() { for (const r of attive.values()) r.annulla(); socket.close(); } };
}

/**
 * Codice di abbinamento di questa installazione (8 caratteri, senza 0/O/1/I). Il server cerca
 * il ponte per utente + codice, cosi' piu' persone con lo stesso utente non si scambiano le chat.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function nuovoCodice() {
  const b = randomBytes(8);
  return [...b].map((x) => ALFABETO[x % ALFABETO.length]).join('');
}
export const formattaCodice = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;

/** Login con utente e password: restituisce il JWT. */
export async function login(server, username, password) {
  let r;
  try {
    r = await fetch(`${server.replace(/\/$/, '')}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(10000),
    });
  } catch { throw new Error('Server non raggiungibile'); }
  if (r.status === 401) throw new Error('Utente o password errati');
  if (!r.ok) throw new Error(`Accesso fallito (${r.status})`);
  return (await r.json()).accessToken;
}
