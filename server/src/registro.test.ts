import { test } from "node:test";
import assert from "node:assert/strict";
import { ErrorePonte, RegistroPonti, type SocketPonte } from "./registro.ts";
import { normalizzaCodiceAbbinamento, formattaCodiceAbbinamento } from "./protocollo.ts";

const sock = (id: string) => {
  const emessi: [string, unknown][] = [];
  return { id, emessi, emit: (e: string, d: unknown) => { emessi.push([e, d]); }, disconnect: () => {} } satisfies SocketPonte & { emessi: unknown };
};
const C = "AAAAAAAA";

test("codice di abbinamento", () => {
  assert.equal(normalizzaCodiceAbbinamento("abcd-efgh"), "ABCDEFGH");
  assert.equal(normalizzaCodiceAbbinamento("0000"), "");
  assert.equal(formattaCodiceAbbinamento("ABCDEFGH"), "ABCD-EFGH");
});

test("registro: instrada, rifiuta, isola utenti, annulla", () => {
  const r = new RegistroPonti();
  assert.throws(() => r.start("u", C, { prompt: "x", token: "t" }, () => {}), (e: unknown) => e instanceof ErrorePonte && e.http === 503 && e.codice === "nessun-ponte");
  const s = sock("1");
  r.register("u", C, s);
  assert.equal(r.status("v", C).bridgeConnected, false);
  const ev: string[] = [];
  r.start("u", C, { prompt: "x", token: "t" }, (e) => ev.push(e.type));
  const runId = (s.emessi[0]![1] as { runId: string }).runId;
  assert.throws(() => r.start("u", C, { prompt: "y", token: "t" }, () => {}), (e: unknown) => e instanceof ErrorePonte && e.codice === "gia-in-corso");
  r.receive("altro", C, runId, { type: "text", text: "no" });
  r.receive("u", C, runId, { type: "text", text: "sì" });
  r.receive("u", C, runId, { type: "done", sessionId: "s", reply: "ok", isError: false });
  assert.deepEqual(ev, ["text", "done"]);
  const ev2: string[] = [];
  r.start("u", C, { prompt: "z", token: "t" }, (e) => ev2.push(e.type));
  r.unregister("u", C, s);
  assert.deepEqual(ev2, ["error"]);
});

test("messaggi sostituibili e timeout", async () => {
  const r = new RegistroPonti({ timeoutMs: 20, messaggi: () => ({ nessunPonte: "No bridge", tempoScaduto: "Timeout" }) });
  assert.throws(() => r.start("u", C, { prompt: "x", token: "t" }, () => {}), /No bridge/);
  const s = sock("1");
  r.register("u", C, s);
  const msg: string[] = [];
  r.start("u", C, { prompt: "x", token: "t" }, (e) => e.type === "error" && msg.push(e.message));
  await new Promise((ok) => setTimeout(ok, 60));
  assert.deepEqual(msg, ["Timeout"]);
  assert.equal(s.emessi.at(-1)![0], "cancel");
});
