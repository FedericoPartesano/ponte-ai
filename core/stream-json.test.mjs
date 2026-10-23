import test from 'node:test';
import assert from 'node:assert/strict';
import { creaTraduttore } from './stream-json.mjs';

const riga = (o) => JSON.stringify(o);

test('testo, strumento, fine', () => {
  const t = creaTraduttore();
  assert.deepEqual(t(riga({ type: 'system', subtype: 'init', session_id: 's1' })), []);
  assert.deepEqual(
    t(riga({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Ciao' } } })),
    [{ type: 'text', text: 'Ciao' }],
  );
  assert.deepEqual(
    t(riga({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'a', name: 'mcp__smlbi__add_widget' }] } })),
    [{ type: 'tool', name: 'add_widget', phase: 'start' }],
  );
  assert.deepEqual(
    t(riga({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'a', is_error: true }] } })),
    [{ type: 'tool', name: 'add_widget', phase: 'end', isError: true }],
  );
  assert.deepEqual(t(riga({ type: 'result', result: 'fatto', session_id: 's1', is_error: false })), [
    { type: 'done', sessionId: 's1', reply: 'fatto', isError: false },
  ]);
});

test('righe non JSON o sconosciute si ignorano', () => {
  const t = creaTraduttore();
  assert.deepEqual(t('non json'), []);
  assert.deepEqual(t(riga({ type: 'qualcosa_di_nuovo' })), []);
});
