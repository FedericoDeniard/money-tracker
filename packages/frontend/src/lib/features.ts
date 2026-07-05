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
