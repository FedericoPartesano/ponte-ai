# @ponte-ai/server

Backend side of [Ponte AI](https://github.com/FedericoPartesano/ponte-ai), framework-agnostic
(Socket.IO, Nest, Express, Fastify). Each application plugs in its own authentication, texts and
prompt; this package holds what is the same everywhere.

- `protocol` (also `@ponte-ai/server/protocol`, no Node dependencies, safe for the browser): event names, types, pairing code helpers (`/agent`, `run`, `cancel`, `event`, `x-bridge-code`).
- `BridgeRegistry`: connected bridges per user + pairing code, runs in progress, timeout, cancel.
- `attachGateway`: wires the `/agent` Socket.IO namespace to a registry.

## Usage

```ts
import { AGENT_NAMESPACE, BridgeError, BridgeRegistry, attachGateway, normalizePairingCode } from '@ponte-ai/server';

const registry = new BridgeRegistry({
  timeoutMs: 180_000,                           // default
  messages: () => ({ noBridge: t('...') }),     // optional: your i18n; evaluated at every error
});

// Socket.IO: verify the handshake yourself, return the user name (or null to reject)
attachGateway(io.of(AGENT_NAMESPACE), registry, {
  authenticate: ({ token }) => verifyJwt(token)?.sub ?? null,
});

// HTTP route: `start` throws BridgeError (`http` 400 | 503, `code`): map it to your framework's exception
const cancel = registry.start(user, normalizePairingCode(req.headers['x-bridge-code']),
  { prompt, token }, (event) => sse.write(event));
```

Nest: use `attachGateway(server, registry, ...)` in `afterInit(server)` of a
`@WebSocketGateway({ namespace: AGENT_NAMESPACE })`, and wrap `BridgeRegistry` in an injectable
service that turns `BridgeError` into `BadRequestException` / `ServiceUnavailableException`.

A rejected handshake fails with `connect_error: unauthorized`; the bridge retries with a fresh
token (a server-side `disconnect` would never be retried by socket.io clients).

## Extension points

| What | How |
| --- | --- |
| Authentication, user name | `attachGateway(..., { authenticate })` |
| Texts / language | `BridgeRegistry({ messages })` |
| Run cap | `BridgeRegistry({ timeoutMs })` |
| Errors to HTTP | catch `BridgeError` (`http`, `code`) |
| Prompt, MCP tools, output blocks | your application (not in this package) |
