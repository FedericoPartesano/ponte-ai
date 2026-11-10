import { test } from "node:test";
import assert from "node:assert/strict";
import { BridgeError, BridgeRegistry, type BridgeSocket } from "./registry.ts";
import { formatPairingCode, normalizePairingCode } from "./protocol.ts";

const sock = (id: string) => {
  const emitted: [string, unknown][] = [];
  return { id, emitted, emit: (e: string, d: unknown) => { emitted.push([e, d]); }, disconnect: () => {} } satisfies BridgeSocket & { emitted: unknown };
};
const C = "AAAAAAAA";

test("pairing code", () => {
  assert.equal(normalizePairingCode("abcd-efgh"), "ABCDEFGH");
  assert.equal(normalizePairingCode("0000"), "");
  assert.equal(formatPairingCode("ABCDEFGH"), "ABCD-EFGH");
});

test("registry: routes, rejects, isolates users, cancels", () => {
  const r = new BridgeRegistry();
  assert.throws(() => r.start("u", C, { prompt: "x", token: "t" }, () => {}), (e: unknown) => e instanceof BridgeError && e.http === 503 && e.code === "no-bridge");
  const s = sock("1");
  r.register("u", C, s);
  assert.equal(r.status("v", C).bridgeConnected, false);
  const ev: string[] = [];
  r.start("u", C, { prompt: "x", token: "t" }, (e) => ev.push(e.type));
  const runId = (s.emitted[0]![1] as { runId: string }).runId;
  assert.throws(() => r.start("u", C, { prompt: "y", token: "t" }, () => {}), (e: unknown) => e instanceof BridgeError && e.code === "run-in-progress");
  r.receive("other", C, runId, { type: "text", text: "no" });
  r.receive("u", C, runId, { type: "text", text: "yes" });
  r.receive("u", C, runId, { type: "done", sessionId: "s", reply: "ok", isError: false });
  assert.deepEqual(ev, ["text", "done"]);
  const ev2: string[] = [];
  r.start("u", C, { prompt: "z", token: "t" }, (e) => ev2.push(e.type));
  r.unregister("u", C, s);
  assert.deepEqual(ev2, ["error"]);
});

test("replaceable messages and timeout", async () => {
  const r = new BridgeRegistry({ timeoutMs: 20, messages: () => ({ noBridge: "Nessun ponte", timeout: "Tempo scaduto" }) });
  assert.throws(() => r.start("u", C, { prompt: "x", token: "t" }, () => {}), /Nessun ponte/);
  const s = sock("1");
  r.register("u", C, s);
  const msg: string[] = [];
  r.start("u", C, { prompt: "x", token: "t" }, (e) => e.type === "error" && msg.push(e.message));
  await new Promise((ok) => setTimeout(ok, 60));
  assert.deepEqual(msg, ["Tempo scaduto"]);
  assert.equal(s.emitted.at(-1)![0], "cancel");
});
