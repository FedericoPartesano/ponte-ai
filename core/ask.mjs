#!/usr/bin/env node
// Client di prova per POST /agent/runs (SSE): stampa gli eventi. Fa da modello per la libreria client.
//   node ask.mjs --server http://localhost:3000 --user admin --password admin --dataset <id> "domanda"
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const server = (arg('server') ?? '').replace(/\/$/, '');
const message = process.argv.filter((a, i, v) => !a.startsWith('--') && !v[i - 1]?.startsWith('--')).at(-1);
const login = await fetch(`${server}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: arg('user'), password: arg('password') }) });
const { accessToken } = await login.json();
const H = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
console.log('stato:', await (await fetch(`${server}/agent/status`, { headers: H })).json());
const ac = new AbortController();
process.on('SIGINT', () => ac.abort());
const t0 = Date.now(); let primo = true;
const r = await fetch(`${server}/agent/runs`, { method: 'POST', headers: H, signal: ac.signal, body: JSON.stringify({ message, datasetId: arg('dataset'), dashboardId: arg('dashboard'), sessionId: arg('session') }) });
if (!r.ok) { console.error(r.status, await r.text()); process.exit(1); }
const dec = new TextDecoder(); let buf = '';
for await (const chunk of r.body) {
  buf += dec.decode(chunk, { stream: true });
  let i;
  while ((i = buf.indexOf('\n\n')) >= 0) {
    const blocco = buf.slice(0, i); buf = buf.slice(i + 2);
    if (!blocco.startsWith('data: ')) continue;
    const e = JSON.parse(blocco.slice(6));
    if (primo) { console.log(`[primo evento dopo ${Date.now() - t0} ms]`); primo = false; }
    if (e.type === 'text') process.stdout.write(e.text);
    else if (e.type === 'tool') console.log(`\n[${e.name} ${e.phase}${e.isError ? ' ERRORE' : ''}]`);
    else console.log('\n', e);
  }
}
