/**
 * Protocol between the backend and the "bridge" (the app on the user's PC that launches `claude`).
 * The bridge connects OUTBOUND to the backend (Socket.IO, namespace {@link AGENT_NAMESPACE}):
 * the browser never talks to the PC, so there is no Local Network Access and no open port.
 *
 * This module has no Node dependencies: it can be imported from the browser
 * (`@ponte-ai/server/protocol`).
 */
export const AGENT_PROTOCOL_VERSION = 1;
export const AGENT_NAMESPACE = "/agent";

/** Events of a run, in the order they reach the UI (SSE `data:` JSON). */
export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; phase: "start" | "end"; isError?: boolean }
  | { type: "done"; sessionId: string; reply: string; isError: boolean }
  | { type: "error"; message: string };

/** backend -> bridge */
export interface AgentRunRequest {
  runId: string;
  prompt: string;
  /** Credential of the person chatting: `claude` uses it as Bearer towards the server's MCP. */
  token: string;
  sessionId?: string;
}
export const AGENT_RUN_EVENT = "run";
export const AGENT_CANCEL_EVENT = "cancel";

/** bridge -> backend */
export interface AgentRunEventPayload {
  runId: string;
  event: AgentEvent;
}
export const AGENT_EVENT_EVENT = "event";

export interface AgentStatus {
  bridgeConnected: boolean;
}

/**
 * Pairing code: several people can share the same user, so the user alone does not say WHICH
 * bridge is yours. Each installation has its own code (`auth.code` in the handshake); the browser
 * sends it in the {@link AGENT_CODE_HEADER} header.
 */
export const AGENT_CODE_HEADER = "x-bridge-code";
/** No 0/O/1/I: the code is read and copied by hand. */
export const AGENT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const AGENT_CODE_LENGTH = 8;

/** Uppercase, no separators. Empty string if it is not shaped like a pairing code. */
export function normalizePairingCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== AGENT_CODE_LENGTH) return "";
  return [...c].every((ch) => AGENT_CODE_ALPHABET.includes(ch)) ? c : "";
}

/** `ABCD-EFGH`, for display. */
export function formatPairingCode(code: string): string {
  return code.length === AGENT_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
