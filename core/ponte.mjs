import { randomBytes } from 'node:crypto';
import { io } from 'socket.io-client';
import { avviaClaude } from './claude-run.mjs';

/**
 * Il ponte come libreria (lo usano la riga di comando e l'app Windows).
 * `getToken` e' richiamata a ogni (ri)connessione: un token scaduto non ferma il ponte.
 * `onStato`: 'connesso' | 'scollegato' | 'errore' (con dettaglio).
 */
export function creaPonte({ server, code, getToken, log = () => {}, onStato = () => {}, onRun = () => {} }) {
  server = server.replace(/\/$/, '');
  const socket = io(`${server}/agent`, {
    auth: (cb) => getToken().then((token) => cb({ token, code }), (e) => { onStato('errore', e.message); cb({ token: '', code }); }),
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  const attive = new Map();
  socket.on('connect', () => { log(`collegato a ${server}`); onStato('connesso'); });
  socket.on('disconnect', (m) => { log(`scollegato (${m})`); onStato('scollegato', m); });
  socket.on('connect_error', (e) => { log(`errore di connessione: ${e.message}`); onStato('errore', e.message); });
  socket.on('run', async ({ runId, prompt, token, sessionId }) => {
    log(`run ${runId.slice(0, 8)} avviato`);
    onRun(attive.size + 1);
    const invia = (event) => socket.emit('event', { runId, event });
    try {
      const run = await avviaClaude({
        prompt, token, sessionId, mcpUrl: `${server}/mcp`, onEvent: invia,
        onClose: () => { attive.delete(runId); onRun(attive.size); log(`run ${runId.slice(0, 8)} chiuso`); },
      });
      attive.set(runId, run);
    } catch (e) { invia({ type: 'error', message: String(e.message ?? e) }); }
  });
  socket.on('cancel', ({ runId }) => attive.get(runId)?.annulla());
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
