-- migration: grant_payments_access_to_auth_hook
--
-- purpose:
--   the custom_access_token_hook (defined in
--   supabase/migrations/20260625125528_add_user_roles_and_access_token_hook.sql
--   and extended in
--   supabase/migrations/20260705031217_add_user_capabilities_to_jwt.sql)
--   runs under the supabase_auth_admin role when invoked by GoTrue. it
--   needs to read:
--     - public.user_roles (already granted in the original migration)
--     - payments.subscriptions (NEW — for the user_capabilities join)
--     - payments.plan_capabilities (NEW — for the same join)
--     - payments.capability enum (NEW — implicit via the column type)
--
--   without these grants the hook errors with:
--     ERROR: permission denied for schema payments (SQLSTATE 42501)
--   and GoTrue returns 500 to the client on every login (since the hook
--   is required and a failure blocks token issuance).
--
--   this migration closes the loop. the grants are read-only — the
--   hook only reads payments to compute the claims, never writes. if
--   you need the hook to also see new payments tables in the future,
--   add the SELECT grant here too.
--
-- affected roles: supabase_auth_admin
-- affected schema: payments
-- affected tables: subscriptions, plan_capabilities
--
-- special considerations:
--   * SELECT on the capability enum isn't an explicit grant in postgres
--     (enum types are referenced via their schema and column type). the
--     schema USAGE grant below is what gives the role permission to
--     resolve the type name.
--   * if a future capability requires joining a new payments table,
--     add the SELECT grant in this same migration to keep the hook's
--     grants co-located.

grant usage on schema payments to supabase_auth_admin;
grant select on payments.subscriptions to supabase_auth_admin;
grant select on payments.plan_capabilities to supabase_auth_admin;