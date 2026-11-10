import { AGENT_EVENT_EVENT, normalizePairingCode, type AgentRunEventPayload } from "./protocol.ts";
import type { BridgeRegistry, BridgeSocket } from "./registry.ts";

/** What `attachGateway` needs from a socket (compatible with socket.io `Socket`). */
export interface GatewaySocket extends BridgeSocket {
  handshake: { auth?: Record<string, unknown> };
  data: Record<string, unknown>;
  on(event: string, listener: (...args: any[]) => void): unknown;
}

/** What `attachGateway` needs from the `/agent` namespace (compatible with socket.io `Namespace`). */
export interface GatewayNamespace {
  use(middleware: (socket: any, next: (err?: Error) => void) => void): unknown;
  on(event: "connection", listener: (socket: any) => void): unknown;
}

export interface AttachGatewayOptions {
  /**
   * Verifies the handshake (`auth.token`, `auth.code`...) and returns the user name, or
   * `null`/`undefined` to reject. May be async. Throwing also rejects.
   */
  authenticate(auth: Record<string, unknown>): string | null | undefined | Promise<string | null | undefined>;
}

/** Message the bridge sees in `connect_error` when the handshake is rejected. */
export const UNAUTHORIZED = "unauthorized";

/**
 * Wires the `/agent` namespace to a {@link BridgeRegistry}: handshake check, registration,
 * events from the bridge, unregistration on disconnect.
 *
 * A rejected handshake fails with `connect_error` (the bridge keeps retrying with a fresh
 * token) instead of a server-side disconnect, which socket.io clients never retry.
 *
 * socket.io: `attachGateway(io.of(AGENT_NAMESPACE), registry, { authenticate })`.
 * Nest: call it in `afterInit(server)` of a `@WebSocketGateway({ namespace: AGENT_NAMESPACE })`.
 */
export function attachGateway(namespace: GatewayNamespace, registry: BridgeRegistry, options: AttachGatewayOptions): void {
  namespace.use((socket: GatewaySocket, next) => {
    const auth = socket.handshake?.auth ?? {};
    const code = normalizePairingCode(auth.code);
    Promise.resolve()
      .then(() => (code ? options.authenticate(auth) : null))
      .then(
        (user) => {
          if (!user) return next(new Error(UNAUTHORIZED));
          socket.data.user = user;
          socket.data.code = code;
          next();
        },
        () => next(new Error(UNAUTHORIZED)),
      );
  });
  namespace.on("connection", (socket: GatewaySocket) => {
    const user = socket.data.user as string;
    const code = socket.data.code as string;
    registry.register(user, code, socket);
    socket.on(AGENT_EVENT_EVENT, (body?: AgentRunEventPayload) => {
      if (body?.runId && body.event) registry.receive(user, code, body.runId, body.event);
    });
    socket.on("disconnect", () => registry.unregister(user, code, socket));
  });
}
