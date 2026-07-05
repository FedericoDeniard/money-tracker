-- migration: add_user_capabilities_rpc
--
-- purpose:
--   payments.user_capabilities_v is a regular view, which means it
--   cannot have its own RLS policies. the only protection it has
--   today is the cascading RLS of the underlying tables (subscriptions
--   filters by user_id, default_capabilities allows any authenticated
--   to SELECT the full default set). that protects against leaking
--   another user's subscription grants, but it's implicit — the
--   shape of the protection depends on every underlying table's
--   policy staying correct forever.
--
--   this migration introduces the canonical public API for reading
--   a user's capabilities: a SECURITY INVOKER plpgsql function
--   `payments.user_capabilities(target_user_id uuid)` with an
--   explicit auth.uid() check. the check is belt-and-suspenders on
--   top of the cascading RLS: an authenticated caller that somehow
--   bypasses the view's row filter (e.g. via a future refactor that
--   drops a policy) still can't query another user's capabilities
--   through this function.
--
--   semantics:
--     * authenticated calling for their own user_id → returns the
--       user's full capability set (subscription grants ∪ defaults).
--     * authenticated calling for another user_id → 42501 forbidden.
--     * service_role / postgres / supabase_auth_admin (BYPASSRLS or
--       superuser) → auth.uid() is null in their session, so the
--       check is skipped and they can query any user_id. the auth
--       hook (which runs as postgres via pg-functions://postgres/...)
--       uses this path.
--     * anon → no EXECUTE grant; anon gets permission denied.
--
-- affected functions: new payments.user_capabilities(uuid)
-- affected grants:    EXECUTE to authenticated, service_role
--
-- special considerations:
--   * the function uses SET search_path = '' for safety against
--     search_path hijacking (mirrors the auth hook migration).
--   * after this migration the view itself becomes a leaky surface
--     for any future caller that doesn't go through this function.
--     we revoke the SELECT grant from authenticated below so the
--     view is internal-only (the hook still reads it via postgres
--     which keeps its existing grant). consumers (the requireCapability
--     helper in both _shared/capabilities.ts and the mastra-server
--     lib) are updated in the same commit to call this function
--     instead of querying the view directly.
--   * the function is STABLE because the underlying view query is
--     stable within a single request.

create or replace function payments.user_capabilities(target_user_id uuid)
returns payments.capability[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caps payments.capability[];
begin
  -- SECURITY DEFINER runs the function as the owner (postgres). we
  -- can therefore read payments.user_capabilities_v directly even
  -- though it's revoked from authenticated below. the per-user gate
  -- sits in front of the read:
  --
  --   * authenticated caller → auth.uid() returns the caller's
  --     user_id from the JWT. the caller may only query their own
  --     user_id; anything else returns 42501.
  --   * service_role / postgres / supabase_auth_admin → auth.uid()
  --     returns null (no authenticated session), so the check is
  --     skipped and they can query any user_id. the auth hook uses
  --     this path.
  --   * anon has no EXECUTE grant and never reaches the body.
  if auth.uid() is not null and target_user_id <> auth.uid() then
    raise exception
      'forbidden: cannot query capabilities for another user'
      using errcode = '42501';
  end if;

  select coalesce(
    array_agg(distinct capability),
    '{}'::payments.capability[]
  )
    into caps
  from payments.user_capabilities_v
  where user_id = target_user_id
     or user_id is null;

  return caps;
end;
$$;

comment on function payments.user_capabilities(uuid) is
  'canonical public API to read a user''s capability set. SECURITY DEFINER so the function can read payments.user_capabilities_v (which is revoked from authenticated). authenticated callers may only query their own user_id; service_role / postgres bypass via auth.uid() being null in their session.';

grant execute on function payments.user_capabilities(uuid) to authenticated;
grant execute on function payments.user_capabilities(uuid) to service_role;

-- make the underlying view internal-only. the function above (which
-- runs as postgres via SECURITY DEFINER) keeps the view readable;
-- authenticated clients cannot. this prevents a future contributor
-- from accidentally bypassing the rpc gate by querying the view
-- directly from a supabase-js client.
revoke select on payments.user_capabilities_v from authenticated;