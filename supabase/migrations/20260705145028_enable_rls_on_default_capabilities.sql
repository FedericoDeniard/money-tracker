-- migration: enable_rls_on_default_capabilities
--
-- purpose:
--   payments.default_capabilities (created in
--   20260705143044_add_default_capabilities_and_view.sql) was the only
--   table in the payments schema without RLS enabled. the data is
--   product info — the list of capabilities every authenticated user
--   gets for free — so it's not sensitive on its own, and the auth
--   hook + service_role reads continue to work without a policy
--   (postgres has BYPASSRLS; the hook runs as postgres via
--   pg-functions://postgres/...). however, leaving RLS off while
--   every other table enforces it is the wrong default: a future
--   contributor can add a sensitive column without realizing the
--   security posture differs from the rest of the schema. enabling
--   RLS with an explicit policy keeps the model uniform and the
--   intent documented.
--
-- affected tables: payments.default_capabilities (RLS enabled,
--   SELECT policy added)
--
-- special considerations:
--   * the explicit policy `to authenticated using (true)` matches
--     the existing GRANT SELECT to authenticated (also added in
--     20260705143044...), so behavior is unchanged for the
--     authenticated role.
--   * the auth hook does not need an explicit policy. the hook
--     function is invoked via pg-functions://postgres/public/...,
--     which connects as the postgres role. postgres has the
--     BYPASSRLS attribute, so it reads through any RLS regardless
--     of policy. the same is true for service_role.
--   * anon still has no SELECT grant on the table, so RLS being
--     enabled does not change anything for them: anon cannot read
--     either before or after this migration.
--   * if a future use case needs a writable policy on this table
--     (e.g. letting users opt-out of a default capability), add a
--     separate `for insert / update / delete` policy targeting the
--     relevant role and table column.

alter table payments.default_capabilities enable row level security;

create policy "default_capabilities_select_authenticated"
  on payments.default_capabilities
  as permissive
  for select
  to authenticated
  using (true);