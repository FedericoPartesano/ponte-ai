# @ponte-ai/server

Lato backend di Ponte AI, indipendente dal framework (Nest, Express, Fastify).

- `protocollo`: nomi degli eventi, tipi, codice di abbinamento (`/agent`, `run`, `cancel`, `event`, `x-bridge-code`).
- `RegistroPonti`: ponti collegati per utente + codice, esecuzioni in corso, timeout, annullamento.

## Uso

    import { RegistroPonti, ErrorePonte, AGENT_NAMESPACE, normalizzaCodiceAbbinamento } from '@ponte-ai/server';

    const registro = new RegistroPonti({ timeoutMs: 180_000, messaggi: () => ({ nessunPonte: tr('...') }) });

    // gateway Socket.IO, dopo aver verificato il token dell'handshake
    registro.register(utente, codice, socket);
    socket.on('event', (b) => registro.receive(utente, codice, b.runId, b.event));
    socket.on('disconnect', () => registro.unregister(utente, codice, socket));

    // rotta HTTP: `start` lancia ErrorePonte (`http` 400|503, `codice`): traducila nell'eccezione del framework
    const annulla = registro.start(utente, codice, { prompt, token }, (evento) => sse.write(evento));

L'autenticazione dell'handshake resta nell'applicazione.
