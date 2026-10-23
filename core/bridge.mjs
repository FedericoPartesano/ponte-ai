#!/usr/bin/env node
// Ponte da riga di comando. Uso:
//   node bridge.mjs --server http://localhost:3000 --user admin --password admin
//   node bridge.mjs --server ... --token <JWT>
//   --code ABCD2345  (o SMLBI_CODE) codice di abbinamento; se manca se ne crea uno e lo si stampa
import { creaPonte, login, nuovoCodice, formattaCodice } from './ponte.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const server = (arg('server', process.env.SMLBI_SERVER) ?? '').replace(/\/$/, '');
if (!server) { console.error('Manca --server'); process.exit(2); }
const fisso = arg('token', process.env.SMLBI_TOKEN);
const code = (arg('code', process.env.SMLBI_CODE) ?? nuovoCodice()).toUpperCase().replace(/[^A-Z0-9]/g, '');
console.log(`[ponte] codice di abbinamento: ${formattaCodice(code)}  (da inserire nella pagina web)`);
const ponte = creaPonte({
  server,
  code,
  getToken: async () => fisso ?? login(server, arg('user'), arg('password')),
  log: (m) => console.log(`[ponte] ${m}`),
});
process.on('SIGINT', () => { ponte.stop(); process.exit(0); });
