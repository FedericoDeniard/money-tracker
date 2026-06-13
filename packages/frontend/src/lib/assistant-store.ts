import { nanoid } from "nanoid";

/**
 * Generates a unique thread id. Uses crypto.randomUUID when available
 * (HTTPS / localhost) and falls back to nanoid otherwise.
 */
export function generateThreadId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  return nanoid();
}

export interface QueuedAutoSend {
  text: string;
  files: Array<{
    type: "file";
    mediaType: string;
    filename: string;
    url: string;
  }>;
}

/**
 * In-memory auto-send queue. Cleared on page reload so F5 never re-fires
 * the greeting prompt (sessionStorage persisted across reloads — root cause).
 */
const autoSendByThread = new Map<string, QueuedAutoSend>();
/** Prevents duplicate auto-send on React Strict Mode double-mount (same page session). */
const autoSendConsumedThreads = new Set<string>();

export function queueAutoSend(threadId: string, payload: QueuedAutoSend): void {
  autoSendByThread.set(threadId, payload);
}

export function consumeAutoSend(threadId: string): QueuedAutoSend | undefined {
  if (autoSendConsumedThreads.has(threadId)) return undefined;
  const payload = autoSendByThread.get(threadId);
  if (payload === undefined) return undefined;
  autoSendByThread.delete(threadId);
  autoSendConsumedThreads.add(threadId);
  return payload;
}

export function clearLegacyPendingStorage(threadId: string): void {
  try {
    sessionStorage.removeItem(`assistant:pending:${threadId}`);
    sessionStorage.removeItem(`assistant:pending-sent:${threadId}`);
    sessionStorage.removeItem(`assistant:auto-send:${threadId}`);
  } catch {
    // ignore
  }
}
