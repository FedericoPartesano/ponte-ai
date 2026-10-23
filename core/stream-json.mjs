/**
 * Traduce le righe di `claude --output-format stream-json --verbose --include-partial-messages`
 * negli eventi del protocollo (AgentEvent). Lo schema di claude non e' documentato per intero
 * (anthropics/claude-code#24596): qui si leggono solo i campi che servono e tutto il resto si
 * ignora, cosi' un campo nuovo non rompe la chat.
 */
export function creaTraduttore() {
  const strumenti = new Map(); // tool_use id -> nome
  let sessionId;
  let testo = '';

  return function traduci(riga) {
    let m;
    try {
      m = JSON.parse(riga);
    } catch {
      return [];
    }
    if (!m || typeof m !== 'object') return [];
    if (m.session_id) sessionId = m.session_id;

    if (m.type === 'stream_event') {
      const d = m.event?.delta;
      if (m.event?.type === 'content_block_delta' && d?.type === 'text_delta' && d.text) {
        testo += d.text;
        return [{ type: 'text', text: d.text }];
      }
      return [];
    }
    if (m.type === 'assistant') {
      const out = [];
      for (const b of m.message?.content ?? []) {
        if (b.type === 'tool_use') {
          strumenti.set(b.id, b.name);
          out.push({ type: 'tool', name: nomeBreve(b.name), phase: 'start' });
        }
      }
      return out;
    }
    if (m.type === 'user') {
      const out = [];
      for (const b of m.message?.content ?? []) {
        if (b.type === 'tool_result') {
          out.push({ type: 'tool', name: nomeBreve(strumenti.get(b.tool_use_id) ?? '?'), phase: 'end', isError: Boolean(b.is_error) });
        }
      }
      return out;
    }
    if (m.type === 'result') {
      return [{ type: 'done', sessionId: m.session_id ?? sessionId ?? '', reply: m.result || testo || '(nessuna risposta)', isError: Boolean(m.is_error) }];
    }
    return [];
  };
}

/** `mcp__smlbi__add_widget` -> `add_widget` */
export function nomeBreve(nome) {
  return String(nome).replace(/^mcp__[^_]+(?:_[^_]+)*?__/, '');
}
