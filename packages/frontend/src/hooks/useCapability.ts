import { useAuth } from "./useAuth";
import type { Capability } from "../lib/capabilities";

export interface CapabilityAccess {
  allowed: boolean;
  loading: boolean;
}

/**
 * Returns whether the current user has a given capability.
 *
 * This hook reads from the JWT `user_capabilities` claim (decoded in
 * `useAuth` into `capabilities`). It is the UI hint, not the security
 * boundary: a stale token can briefly report `allowed: true` after a
 * subscription downgrades until the token refreshes. The authoritative
 * check is `requireCapability` inside edge functions, which always
 * re-queries `payments.subscriptions` + `payments.plan_capabilities` —
 * see supabase/functions/_shared/capabilities.ts.
 *
 * Use this hook to:
 *   - hide/disable buttons the user can't use
 *   - render upgrade prompts
 *   - guard routes via <RequireCapability> in routes/index.tsx
 */
export function useCapability(capability: Capability): CapabilityAccess {
  const { capabilities, loading } = useAuth();
  return {
    allowed: capabilities.includes(capability),
    loading,
  };
}
