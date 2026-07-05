/**
 * Minimal translator shape. Compatible with `t` returned by
 * `useTranslation()` from react-i18next (which has a richer overload
 * set but is callable as `(key: string) => string` for our needs).
 */
export type Translator = (key: string) => string;

/**
 * Classifies an error thrown by an edge function call into a small
 * discriminated union that the UI can branch on. The classifier is
 * intentionally string-based because edge function errors come over
 * the wire as plain JSON and the service layer surfaces them as
 * `Error.message`.
 *
 * The two "premium" categories (`forbidden-role`, `forbidden-capability`)
 * are detected by matching the prefixes that the server-side helpers
 * emit:
 *
 *   `requireMinRole`     in _shared/auth.ts        → "Requires role 'X'"
 *   `requireCapability`  in _shared/capabilities.ts → "Requires capability: X"
 *
 * Keep these in sync — the server's literal strings are the contract.
 */
export type EdgeFunctionErrorType =
  | "auth"
  | "forbidden-role"
  | "forbidden-capability"
  | "network"
  | "unknown";

export interface ClassifiedEdgeFunctionError {
  type: EdgeFunctionErrorType;
  message: string;
}

const ROLE_FORBIDDEN_PREFIX = "Requires role '";
const CAPABILITY_FORBIDDEN_PREFIX = "Requires capability: ";

const AUTH_PHRASES = [
  "No active session",
  "Authentication required",
  "Missing or invalid authorization header",
  "Invalid or expired token",
];

export function classifyEdgeFunctionError(
  err: unknown
): ClassifiedEdgeFunctionError {
  const message = err instanceof Error ? err.message : String(err);

  if (message.startsWith(ROLE_FORBIDDEN_PREFIX)) {
    return { type: "forbidden-role", message };
  }
  if (message.startsWith(CAPABILITY_FORBIDDEN_PREFIX)) {
    return { type: "forbidden-capability", message };
  }
  if (AUTH_PHRASES.some(phrase => message.includes(phrase))) {
    return { type: "auth", message };
  }
  return { type: "unknown", message };
}

/**
 * Returns the message that should be surfaced to the user via toast
 * (or any other channel). For forbidden-role and forbidden-capability
 * errors we substitute a single i18n string so the user always sees a
 * consistent "this is a premium feature" message regardless of which
 * capability or role was actually missing — the underlying detail is
 * not actionable for them in this phase. Once Phase 2 lands (inline
 * banners per surface), callers can branch on `classification.type` to
 * show feature-specific upsell messaging.
 */
export function getEdgeFunctionErrorMessage(
  err: unknown,
  t: Translator
): string {
  const classification = classifyEdgeFunctionError(err);
  if (
    classification.type === "forbidden-role" ||
    classification.type === "forbidden-capability"
  ) {
    return t("errors.premiumFeature");
  }
  return classification.message;
}

/**
 * Convenience: returns true when the error is one that should trigger
 * the premium-feature UX (toast today, banner in Phase 2) rather than
 * a generic error message.
 */
export function isPremiumFeatureError(err: unknown): boolean {
  const type = classifyEdgeFunctionError(err).type;
  return type === "forbidden-role" || type === "forbidden-capability";
}
