import type { Database } from "../types/database.types";

/**
 * Application role. Mirrors the `public.app_role` enum defined in
 * supabase/migrations/20260625125528_add_user_roles_and_access_token_hook.sql.
 *
 * Derived from the generated DB types when the migration has been applied
 * (`bun docker:db:types`), with a hardcoded fallback so the frontend
 * still type-checks before regeneration. Once the DB types include
 * `public.Enums.app_role`, this is the single source of truth.
 */
export type UserRole =
  NonNullable<Database["public"]["Enums"]["app_role"]> extends string
    ? NonNullable<Database["public"]["Enums"]["app_role"]>
    : "user" | "tester" | "admin";

const ROLE_LEVEL: Readonly<Record<UserRole, number>> = Object.freeze({
  user: 0,
  tester: 1,
  admin: 2,
});

export function roleLevel(role: UserRole): number {
  return ROLE_LEVEL[role];
}

export function hasMinRole(actual: UserRole, required: UserRole): boolean {
  return roleLevel(actual) >= roleLevel(required);
}

/**
 * The set of features that are gated by role. Add a new entry to lock a
 * feature behind a minimum role; remove or lower the value to open it up.
 *
 * Today every feature is set to `user` so the access middleware reports
 * `allowed: true` for everyone. The single place to start restricting is
 * this map — components consuming `useFeatureAccess(key)` will start
 * showing banners automatically once a value is raised.
 */
export const FEATURES = {
  seed: "user",
  chat: "user",
  metrics: "user",
  transactions: "user",
  subscriptions: "user",
  settings: "user",
  processDocument: "user",
  gmailConnect: "user",
} as const satisfies Record<string, UserRole>;

export type FeatureKey = keyof typeof FEATURES;

export function requiredRoleFor(featureKey: FeatureKey): UserRole {
  return FEATURES[featureKey];
}

export function canAccess(
  role: UserRole | null,
  featureKey: FeatureKey
): boolean {
  if (!role) return false;
  return hasMinRole(role, requiredRoleFor(featureKey));
}
