import { test } from "node:test";
import assert from "node:assert/strict";
import { attachGateway, UNAUTHORIZED, type GatewayNamespace } from "./gateway.ts";
import { BridgeRegistry } from "./registry.ts";

const C = "AAAAAAAA";

function fakeNamespace() {
  let middleware!: (s: any, n: (e?: Error) => void) => void;
  let onConnection!: (s: any) => void;
  const ns: GatewayNamespace = { use: (m) => { middleware = m; }, on: (_e, l) => { onConnection = l; } };
  const socket = (auth: Record<string, unknown>) => {
    const handlers = new Map<string, (...a: any[]) => void>();
    return {
      id: "s1", handshake: { auth }, data: {} as Record<string, unknown>, emitted: [] as [string, unknown][],
      emit(e: string, d: unknown) { this.emitted.push([e, d]); }, disconnect() {},
      on(e: string, l: (...a: any[]) => void) { handlers.set(e, l); }, handlers,
    };
  };
  const handshake = (s: ReturnType<typeof socket>) => new Promise<Error | undefined>((ok) => middleware(s, ok));
  return { ns, socket, handshake, connect: (s: any) => onConnection(s) };
}

test("rejects missing code or failed authentication with connect_error", async () => {
  const { ns, socket, handshake } = fakeNamespace();
  attachGateway(ns, new BridgeRegistry(), { authenticate: (a) => (a.token === "good" ? "u" : null) });
  assert.equal((await handshake(socket({ token: "good" })))?.message, UNAUTHORIZED);
  assert.equal((await handshake(socket({ token: "bad", code: C })))?.message, UNAUTHORIZED);
  assert.equal((await handshake(socket({ token: "good", code: C }))), undefined);
});

test("authenticate that throws rejects", async () => {
  const { ns, socket, handshake } = fakeNamespace();
  attachGateway(ns, new BridgeRegistry(), { authenticate: async () => { throw new Error("jwt"); } });
  assert.equal((await handshake(socket({ token: "x", code: C })))?.message, UNAUTHORIZED);
});

test("registers the bridge, routes events, unregisters on disconnect", async () => {
  const { ns, socket, handshake, connect } = fakeNamespace();
  const registry = new BridgeRegistry();
  attachGateway(ns, registry, { authenticate: () => "u" });
  const s = socket({ token: "t", code: "aaaa-aaaa" });
  await handshake(s);
  connect(s);
  assert.equal(registry.status("u", C).bridgeConnected, true);
  const ev: string[] = [];
  registry.start("u", C, { prompt: "p", token: "t" }, (e) => ev.push(e.type));
  const runId = (s.emitted[0]![1] as { runId: string }).runId;
  s.handlers.get("event")!({ runId, event: { type: "text", text: "hi" } });
  s.handlers.get("event")!({});
  s.handlers.get("disconnect")!();
  assert.equal(registry.status("u", C).bridgeConnected, false);
  assert.deepEqual(ev, ["text", "error"]);
});
