import { randomUUID } from "node:crypto";
import { AGENT_CANCEL_EVENT, AGENT_RUN_EVENT, type AgentEvent, type AgentRunRequest, type AgentStatus } from "./protocollo.ts";

/** Il minimo che serve di un socket (compatibile con socket.io `Socket`). */
export interface SocketPonte {
  id: string;
  emit(evento: string, dati: unknown): unknown;
  disconnect(chiudi?: boolean): unknown;
}

/** Chiave stabile di un errore: l'adattatore la usa per tradurre il messaggio. */
export type CodiceErrorePonte = "nessun-ponte" | "gia-in-corso";

/** Errore con codice HTTP suggerito: l'adattatore (Nest, Express, Fastify) lo traduce. */
export class ErrorePonte extends Error {
  readonly http: 400 | 503;
  readonly codice?: CodiceErrorePonte;
  constructor(message: string, http: 400 | 503, codice?: CodiceErrorePonte) {
    super(message);
    this.http = http;
    this.codice = codice;
  }
}

/** Testi mostrati all'utente. Si possono sostituire (es. con l'i18n dell'applicazione). */
export interface MessaggiPonte {
  nessunPonte: string;
  giaInCorso: string;
  disconnesso: string;
  tempoScaduto: string;
}
export const MESSAGGI_PREDEFINITI: MessaggiPonte = {
  nessunPonte: "Nessun ponte collegato con questo codice",
  giaInCorso: "Una richiesta è già in corso",
  disconnesso: "Il ponte si è disconnesso",
  tempoScaduto: "Tempo scaduto",
};

export interface OpzioniRegistro {
  /** Tetto di una esecuzione, in ms. Default 180000. */
  timeoutMs?: number;
  /** Sostituisce i testi. Può essere una funzione, valutata a ogni errore (lingua dell'utente). */
  messaggi?: Partial<MessaggiPonte> | (() => Partial<MessaggiPonte>);
}

interface Run { key: string; onEvent: (e: AgentEvent) => void; timer: ReturnType<typeof setTimeout> }

/**
 * Registro dei ponti collegati (uno per utente+codice) e delle esecuzioni in corso.
 * Non sa niente di `claude` né di HTTP: instrada richieste verso il ponte e gli eventi indietro.
 */
export class RegistroPonti {
  private readonly bridges = new Map<string, SocketPonte>();
  private readonly runs = new Map<string, Run>();
  private readonly timeoutMs: number;
  private readonly opzioni: OpzioniRegistro;
  constructor(opzioni: OpzioniRegistro = {}) {
    this.opzioni = opzioni;
    this.timeoutMs = opzioni.timeoutMs ?? 180_000;
  }

  private testi(): MessaggiPonte {
    const m = this.opzioni.messaggi;
    return { ...MESSAGGI_PREDEFINITI, ...(typeof m === "function" ? m() : m) };
  }

  private key(utente: string, code: string): string { return `${utente}\u0000${code}`; }

  register(utente: string, code: string, socket: SocketPonte): void {
    const key = this.key(utente, code);
    const old = this.bridges.get(key);
    if (old && old.id !== socket.id) old.disconnect(true);
    this.bridges.set(key, socket);
  }

  unregister(utente: string, code: string, socket: SocketPonte): void {
    const key = this.key(utente, code);
    if (this.bridges.get(key)?.id !== socket.id) return;
    this.bridges.delete(key);
    for (const [runId, run] of this.runs) {
      if (run.key === key) this.finish(runId, { type: "error", message: this.testi().disconnesso });
    }
  }

  status(utente: string, code: string): AgentStatus {
    return { bridgeConnected: code !== "" && this.bridges.has(this.key(utente, code)) };
  }

  /** Avvia una esecuzione sul ponte; restituisce la funzione di annullamento. */
  start(utente: string, code: string, req: Omit<AgentRunRequest, "runId">, onEvent: (e: AgentEvent) => void): () => void {
    const key = this.key(utente, code);
    const bridge = code ? this.bridges.get(key) : undefined;
    if (!bridge) throw new ErrorePonte(this.testi().nessunPonte, 503, "nessun-ponte");
    if ([...this.runs.values()].some((r) => r.key === key)) throw new ErrorePonte(this.testi().giaInCorso, 400, "gia-in-corso");
    const runId = randomUUID();
    const timer = setTimeout(() => this.cancel(runId, { type: "error", message: this.testi().tempoScaduto }), this.timeoutMs);
    this.runs.set(runId, { key, onEvent, timer });
    bridge.emit(AGENT_RUN_EVENT, { ...req, runId } satisfies AgentRunRequest);
    return () => this.cancel(runId);
  }

  /** Evento dal ponte. Ignora run sconosciuti o di un altro utente. */
  receive(utente: string, code: string, runId: string, event: AgentEvent): void {
    const run = this.runs.get(runId);
    if (!run || run.key !== this.key(utente, code)) return;
    if (event.type === "done" || event.type === "error") this.finish(runId, event);
    else run.onEvent(event);
  }

  private cancel(runId: string, last?: AgentEvent): void {
    const run = this.runs.get(runId);
    if (!run) return;
    this.bridges.get(run.key)?.emit(AGENT_CANCEL_EVENT, { runId });
    this.finish(runId, last);
  }

  private finish(runId: string, last?: AgentEvent): void {
    const run = this.runs.get(runId);
    if (!run) return;
    clearTimeout(run.timer);
    this.runs.delete(runId);
    if (last) run.onEvent(last);
  }
}
