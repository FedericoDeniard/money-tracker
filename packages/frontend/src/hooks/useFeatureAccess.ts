import { useAuth } from "./useAuth";
import {
  type FeatureKey,
  canAccess,
  requiredRoleFor,
  type UserRole,
} from "../lib/features";

export interface FeatureAccess {
  allowed: boolean;
  role: UserRole | null;
  requiredRole: UserRole;
}

/**
 * Returns whether the current user can access a given feature.
 *
 * This is the "preventive middleware" for the UI: it does not block
 * rendering, it just exposes the data a banner / CTA can consume. For
 * actual route-level blocking, route guards in `routes/index.tsx` can
 * read this hook and redirect. Today every feature is open to every
 * role, so `allowed` is `true` whenever the user is signed in; the day a
 * feature in `lib/features.ts` is raised above `user`, `allowed` will
 * start returning `false` for the `user` role automatically.
 */
export function useFeatureAccess(featureKey: FeatureKey): FeatureAccess {
  const { role } = useAuth();
  return {
    allowed: canAccess(role, featureKey),
    role,
    requiredRole: requiredRoleFor(featureKey),
  };
}
