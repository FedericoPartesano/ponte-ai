/**
 * Protocollo fra backend e "ponte" (app sul PC dell'utente che lancia `claude`).
 * Il ponte si collega IN USCITA al backend (Socket.IO, namespace {@link AGENT_NAMESPACE}):
 * il browser non parla mai col PC, quindi niente Local Network Access e nessuna porta aperta.
 */
export const AGENT_PROTOCOL_VERSION = 1;
export const AGENT_NAMESPACE = "/agent";

/** Eventi di una esecuzione, nell'ordine in cui arrivano alla UI (SSE `data:` JSON). */
export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; phase: "start" | "end"; isError?: boolean }
  | { type: "done"; sessionId: string; reply: string; isError: boolean }
  | { type: "error"; message: string };

/** backend -> ponte */
export interface AgentRunRequest {
  runId: string;
  prompt: string;
  /** Credenziale di chi chatta: `claude` la usa come Bearer verso l'MCP del server. */
  token: string;
  sessionId?: string;
}
export const AGENT_RUN_EVENT = "run";
export const AGENT_CANCEL_EVENT = "cancel";

/** ponte -> backend */
export interface AgentRunEventPayload {
  runId: string;
  event: AgentEvent;
}
export const AGENT_EVENT_EVENT = "event";

export interface AgentStatus {
  bridgeConnected: boolean;
}

/**
 * Codice di abbinamento: più persone possono avere lo stesso utente, quindi l'utente da solo non
 * dice QUALE ponte è il tuo. Ogni installazione ha un codice suo (`auth.code` nell'handshake);
 * il browser lo manda nell'intestazione {@link AGENT_CODE_HEADER}.
 */
export const AGENT_CODE_HEADER = "x-bridge-code";
/** Niente 0/O/1/I: il codice si legge e si ricopia a mano. */
export const AGENT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const AGENT_CODE_LENGTH = 8;

/** Maiuscole, senza separatori. Stringa vuota se non ha la forma di un codice. */
export function normalizzaCodiceAbbinamento(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== AGENT_CODE_LENGTH) return "";
  return [...c].every((ch) => AGENT_CODE_ALPHABET.includes(ch)) ? c : "";
}

/** `ABCD-EFGH`, per mostrarlo. */
export function formattaCodiceAbbinamento(code: string): string {
  return code.length === AGENT_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
