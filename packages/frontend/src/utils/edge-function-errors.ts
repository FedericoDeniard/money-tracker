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
 * The three "premium" categories (`forbidden-role`,
 * `forbidden-capability`, `usage-limit`) are detected by matching
 * the prefixes that the server-side helpers emit:
 *
 *   `requireMinRole`             in _shared/auth.ts         → "Requires role 'X'"
 *   `requireCapability`          in _shared/capabilities.ts  → "Requires capability: X"
 *   `check_and_increment_usage`  in _shared/usage_limits    → "Usage limit exceeded: X"
 *
 * Keep these in sync — the server's literal strings are the contract.
 */
export type EdgeFunctionErrorType =
  | "auth"
  | "forbidden-role"
  | "forbidden-capability"
  | "usage-limit"
  | "network"
  | "unknown";

export interface ClassifiedEdgeFunctionError {
  type: EdgeFunctionErrorType;
  message: string;
}

const ROLE_FORBIDDEN_PREFIX = "Requires role '";
const CAPABILITY_FORBIDDEN_PREFIX = "Requires capability: ";
const USAGE_LIMIT_PREFIX = "Usage limit exceeded: ";

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
  if (message.startsWith(USAGE_LIMIT_PREFIX)) {
    return { type: "usage-limit", message };
  }
  if (AUTH_PHRASES.some(phrase => message.includes(phrase))) {
    return { type: "auth", message };
  }
  return { type: "unknown", message };
}

/**
 * Returns the message that should be surfaced to the user via toast
 * (or any other channel). For forbidden-role and forbidden-capability
 * errors we substitute the generic "this is a premium feature" toast;
 * for usage-limit errors we substitute the dedicated "you've hit the
 * monthly limit" copy. Both are about paid-feature access but the
 * distinction is useful for the user: a 429 means "wait a month" or
 * "upgrade" while a 403 means "this feature is paid". Once Phase 2
 * lands (inline banners per surface), callers can branch on
 * `classification.type` to show feature-specific upsell messaging.
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
  if (classification.type === "usage-limit") {
    return t("errors.usageLimitExceeded");
  }
  return classification.message;
}

/**
 * Convenience: returns true when the error is one that should trigger
 * a paid-feature-related UX (premium-feature toast, usage-limit toast,
 * or the inline banners from Phase 2) rather than a generic error
 * message.
 */
export function isPremiumFeatureError(err: unknown): boolean {
  const type = classifyEdgeFunctionError(err).type;
  return (
    type === "forbidden-role" ||
    type === "forbidden-capability" ||
    type === "usage-limit"
  );
}
