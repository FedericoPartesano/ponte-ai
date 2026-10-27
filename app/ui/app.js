const $ = (id) => document.getElementById(id);
let s = null;

const NS = 'http://www.w3.org/2000/svg';
const icona = (d) => {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  for (const [k, v] of Object.entries({ fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(k, v);
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); svg.append(p);
  return svg;
};
const SPUNTA = 'M5 12.5l4.5 4.5L19 7.5';
const CROCE = 'M6 6l12 12M18 6L6 18';
const CESTINO = 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3';

const FRASE = {
  spento: ['', 'Spento'],
  connessione: ['att', 'Mi sto collegando…'],
  connesso: ['ok', 'Collegato'],
  errore: ['err', 'Non riesco a collegarmi, riprovo'],
};

function el(tag, classe, testo) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (testo !== undefined) e.textContent = testo;
  return e;
}

function schedaConnessione(c, claudeOk) {
  const [classe, testo] = FRASE[c.stato] ?? FRASE.spento;
  const riga = el('div', 'conn');
  const info = el('div', 'info');
  const pill = el('span', 'pillola ' + classe);
  pill.append(el('i'), document.createTextNode(c.stato === 'connesso' && c.inUso ? 'Sto lavorando per te…' : testo));
  info.append(el('div', 'nome', c.nome), el('div', 'indirizzo', `${c.utente} · ${c.server}`), pill);
  info.title = c.dettaglio || c.server;

  const sw = el('button', 'interruttore');
  sw.type = 'button';
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', String(c.acceso));
  sw.setAttribute('aria-label', `${c.acceso ? 'Spegni' : 'Accendi'} ${c.nome}`);
  sw.disabled = !claudeOk;
  sw.onclick = () => window.ponte.accendi(c.id, !c.acceso);

  const rim = el('button', 'icona');
  rim.type = 'button';
  rim.title = 'Rimuovi';
  rim.setAttribute('aria-label', `Rimuovi ${c.nome}`);
  rim.append(icona(CESTINO));
  rim.onclick = () => { if (confirm(`Rimuovere "${c.nome}"?`)) window.ponte.rimuovi(c.id); };

  riga.append(info, sw, rim);
  return riga;
}

function riepilogo(connessioni, claude) {
  const accese = connessioni.filter((c) => c.acceso);
  const ok = accese.filter((c) => c.stato === 'connesso').length;
  if (claude.stato === 'assente') return ['err', 'Manca Claude', 'Chiedi al reparto IT di installarlo su questo computer.'];
  if (claude.stato === 'nonAccesso') return ['err', 'Serve accedere a Claude', 'Premi "Accedi a Claude" qui sotto.'];
  if (claude.stato === 'controllo') return ['att', 'Controllo…', ''];
  if (!connessioni.length) return ['att', 'Quasi pronto', 'Aggiungi la tua prima applicazione.'];
  if (!accese.length) return ['', 'Tutto spento', "L'assistente AI non funziona finché non accendi un'applicazione."];
  if (ok === accese.length) return ['ok', 'Tutto pronto', accese.length === 1 ? "Puoi usare l'assistente AI." : `${ok} applicazioni collegate.`];
  if (accese.some((c) => c.stato === 'errore') && !ok) return ['err', 'Non riesco a collegarmi', 'Controlla la rete: riprovo da solo.'];
  return ['att', 'Mi sto collegando…', `${ok} di ${accese.length} collegate.`];
}

function disegna(nuovo) {
  s = nuovo;
  const { connessioni, claude, avvioAuto, serverIT } = s;
  const claudeOk = claude.stato === 'ok';

  const [rc, rt, rf] = riepilogo(connessioni, claude);
  $('riepilogo').className = 'riepilogo ' + rc;
  $('r-titolo').textContent = rt;
  $('r-frase').textContent = rf;

  const sp = $('claude-spunta');
  sp.className = 'spunta ' + (claudeOk ? 'ok' : claude.stato === 'controllo' ? 'att' : 'err');
  sp.replaceChildren(claudeOk ? icona(SPUNTA) : claude.stato === 'controllo' ? icona('M12 7v5l3 2') : icona(CROCE));
  $('claude-testo').textContent = {
    ok: 'Installato e collegato',
    controllo: 'Controllo…',
    assente: 'Non installato su questo computer',
    nonAccesso: "Installato, ma manca l'accesso",
  }[claude.stato];
  const c = $('claude-azione');
  c.hidden = claudeOk || claude.stato === 'controllo';
  c.textContent = claude.stato === 'assente' ? 'Ricontrolla' : 'Accedi a Claude';

  $('elenco').replaceChildren(...connessioni.map((x) => schedaConnessione(x, claudeOk)));
  $('elenco-scheda').hidden = connessioni.length === 0 && !$('form').hidden;
  $('vuoto').hidden = connessioni.length > 0;
  $('auto').setAttribute('aria-checked', String(avvioAuto));
  $('codice').textContent = s.codice;

  const sel = $('scelta');
  if (sel.options.length !== serverIT.length + 1) {
    sel.replaceChildren(sel.options[0], ...serverIT.map((x, i) => Object.assign(document.createElement('option'), { value: String(i), textContent: x.nome })));
  }
  $('riga-it').hidden = serverIT.length === 0;
}

function chiudiForm() { $('form').hidden = true; $('apri-form').hidden = false; $('errore').textContent = ''; if (s) disegna(s); }

$('claude-azione').onclick = () => (s.claude.stato === 'assente' ? window.ponte.ricontrolla() : window.ponte.accediClaude());
$('copia').onclick = async () => {
  try { await navigator.clipboard.writeText(s.codice); $('copia').textContent = 'Copiato'; } catch { $('copia').textContent = 'Seleziona e copia'; }
  setTimeout(() => { $('copia').textContent = 'Copia'; }, 1800);
};
$('auto').onclick = () => window.ponte.avvioAuto($('auto').getAttribute('aria-checked') !== 'true');
$('apri-form').onclick = () => { $('form').hidden = false; $('apri-form').hidden = true; if (s) disegna(s); $('nome').focus(); };
$('annulla').onclick = chiudiForm;
$('scelta').onchange = (e) => {
  const x = s.serverIT[Number(e.target.value)];
  if (e.target.value !== '' && x) { $('nome').value = x.nome; $('server').value = x.server; }
};
$('form').onsubmit = async (e) => {
  e.preventDefault();
  $('errore').textContent = 'Controllo…';
  const r = await window.ponte.aggiungi({ nome: $('nome').value, server: $('server').value, utente: $('utente').value, password: $('password').value });
  $('errore').textContent = r.errore ?? '';
  if (!r.errore) { $('form').reset(); chiudiForm(); }
};
window.ponte.onStato(disegna);
window.ponte.stato().then(disegna);

// ---- scheda Attivita': terminale delle richieste
const term = $('term');
let inPausa = false, nonLette = 0, righe = 0;
const MAX_RIGHE = 500;
const ora = (t) => new Date(t).toLocaleTimeString('it-IT', { hour12: false });
function rigaTraffico(v) {
  const voce = el('div', 'voce');
  const r = el('div', `riga ${v.dir}${v.errore ? ' err' : ''}`);
  const freccia = { in: '←', out: '→', sys: '•' }[v.dir];
  const tipo = [v.tipo, v.dettaglio && `(${v.dettaglio})`].filter(Boolean).join(' ');
  r.append(el('span', 'ora', ora(v.ts)), el('span', 'dir', freccia), el('span', 'conn-n', v.conn), el('span', 'tipo', tipo));
  if (v.runId) r.append(el('span', 'conn-n', `#${v.runId}`));
  if (v.ms !== undefined) r.append(el('span', 'ms', v.ms < 1000 ? `${v.ms} ms` : `${(v.ms / 1000).toFixed(1)} s`));
  voce.append(r);
  if (v.contenuto) {
    r.classList.add('espandibile');
    r.tabIndex = 0;
    r.setAttribute('role', 'button');
    r.setAttribute('aria-expanded', 'false');
    r.prepend(el('span', 'freccia', '▸'));
    const pre = el('pre', 'contenuto', v.contenuto);
    pre.hidden = true;
    const alterna = () => { pre.hidden = !pre.hidden; r.setAttribute('aria-expanded', String(!pre.hidden)); r.firstChild.textContent = pre.hidden ? '▸' : '▾'; };
    r.onclick = alterna;
    r.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alterna(); } };
    voce.append(pre);
  }
  return voce;
}
function aggiungiTraffico(v) {
  if (inPausa) return;
  const fondo = term.scrollHeight - term.scrollTop - term.clientHeight < 30;
  term.querySelector('.vuoto')?.remove();
  term.append(rigaTraffico(v));
  if (++righe > MAX_RIGHE) { term.firstChild.remove(); righe--; }
  if (fondo) term.scrollTop = term.scrollHeight;
  if ($('vista-att').hidden) { nonLette++; $('t-n').textContent = nonLette > 99 ? '99+' : nonLette; $('t-n').hidden = false; }
}
function vuotoTerm() { righe = 0; term.replaceChildren(el('div', 'vuoto', 'In attesa di richieste…')); }
function scheda(att) {
  $('vista-att').hidden = !att; $('vista-conn').hidden = att;
  $('t-att').setAttribute('aria-selected', String(att)); $('t-conn').setAttribute('aria-selected', String(!att));
  if (att) { nonLette = 0; $('t-n').hidden = true; term.scrollTop = term.scrollHeight; }
}
$('t-conn').onclick = () => scheda(false);
$('t-att').onclick = () => scheda(true);
$('pausa').onclick = async () => {
  inPausa = !inPausa;
  $('pausa').textContent = inPausa ? 'Riprendi' : 'Pausa';
  if (!inPausa) { vuotoTerm(); (await window.ponte.traffico()).forEach(aggiungiTraffico); }
};
$('svuota').onclick = async () => { await window.ponte.svuotaTraffico(); vuotoTerm(); };
vuotoTerm();
window.ponte.onTraffico(aggiungiTraffico);
window.ponte.traffico().then((v) => { if (v.length) term.replaceChildren(); righe = 0; v.forEach(aggiungiTraffico); });
