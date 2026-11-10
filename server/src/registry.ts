import { randomUUID } from "node:crypto";
import { AGENT_CANCEL_EVENT, AGENT_RUN_EVENT, type AgentEvent, type AgentRunRequest, type AgentStatus } from "./protocol.ts";

/** The minimum needed from a socket (compatible with socket.io `Socket`). */
export interface BridgeSocket {
  id: string;
  emit(event: string, data: unknown): unknown;
  disconnect(close?: boolean): unknown;
}

/** Stable key of a failure: adapters can use it to translate the message. */
export type BridgeErrorCode = "no-bridge" | "run-in-progress";

/** Error with a suggested HTTP status: the adapter (Nest, Express, Fastify) translates it. */
export class BridgeError extends Error {
  readonly http: 400 | 503;
  readonly code: BridgeErrorCode;
  constructor(message: string, http: 400 | 503, code: BridgeErrorCode) {
    super(message);
    this.http = http;
    this.code = code;
  }
}

/** Texts shown to the user. Replace them (e.g. with the application's i18n). */
export interface BridgeMessages {
  noBridge: string;
  runInProgress: string;
  disconnected: string;
  timeout: string;
}
export const DEFAULT_MESSAGES: BridgeMessages = {
  noBridge: "No bridge connected with this code",
  runInProgress: "A request is already in progress",
  disconnected: "The bridge disconnected",
  timeout: "Timed out",
};

export interface BridgeRegistryOptions {
  /** Cap of a single run, in ms. Default 180000. */
  timeoutMs?: number;
  /** Overrides the texts. A function is evaluated at every error (e.g. language of the user). */
  messages?: Partial<BridgeMessages> | (() => Partial<BridgeMessages>);
}

interface Run { key: string; onEvent: (e: AgentEvent) => void; timer: ReturnType<typeof setTimeout> }

/**
 * Registry of connected bridges (one per user + code) and of runs in progress.
 * It knows nothing about `claude` or HTTP: it routes requests to the bridge and events back.
 */
export class BridgeRegistry {
  private readonly bridges = new Map<string, BridgeSocket>();
  private readonly runs = new Map<string, Run>();
  private readonly timeoutMs: number;
  private readonly options: BridgeRegistryOptions;
  constructor(options: BridgeRegistryOptions = {}) {
    this.options = options;
    this.timeoutMs = options.timeoutMs ?? 180_000;
  }

  private texts(): BridgeMessages {
    const m = this.options.messages;
    return { ...DEFAULT_MESSAGES, ...(typeof m === "function" ? m() : m) };
  }

  private key(user: string, code: string): string { return `${user}\u0000${code}`; }

  /** A new bridge with the same user and code replaces the old one. */
  register(user: string, code: string, socket: BridgeSocket): void {
    const key = this.key(user, code);
    const old = this.bridges.get(key);
    if (old && old.id !== socket.id) old.disconnect(true);
    this.bridges.set(key, socket);
  }

  unregister(user: string, code: string, socket: BridgeSocket): void {
    const key = this.key(user, code);
    if (this.bridges.get(key)?.id !== socket.id) return;
    this.bridges.delete(key);
    for (const [runId, run] of this.runs) {
      if (run.key === key) this.finish(runId, { type: "error", message: this.texts().disconnected });
    }
  }

  status(user: string, code: string): AgentStatus {
    return { bridgeConnected: code !== "" && this.bridges.has(this.key(user, code)) };
  }

  /** Starts a run on the bridge; returns the cancel function. Throws {@link BridgeError}. */
  start(user: string, code: string, req: Omit<AgentRunRequest, "runId">, onEvent: (e: AgentEvent) => void): () => void {
    const key = this.key(user, code);
    const bridge = code ? this.bridges.get(key) : undefined;
    if (!bridge) throw new BridgeError(this.texts().noBridge, 503, "no-bridge");
    if ([...this.runs.values()].some((r) => r.key === key)) throw new BridgeError(this.texts().runInProgress, 400, "run-in-progress");
    const runId = randomUUID();
    const timer = setTimeout(() => this.cancel(runId, { type: "error", message: this.texts().timeout }), this.timeoutMs);
    this.runs.set(runId, { key, onEvent, timer });
    bridge.emit(AGENT_RUN_EVENT, { ...req, runId } satisfies AgentRunRequest);
    return () => this.cancel(runId);
  }

  /** Event from the bridge. Ignores unknown runs or runs of another user/bridge. */
  receive(user: string, code: string, runId: string, event: AgentEvent): void {
    const run = this.runs.get(runId);
    if (!run || run.key !== this.key(user, code)) return;
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
