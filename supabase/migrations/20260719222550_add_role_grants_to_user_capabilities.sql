-- migration: add_role_grants_to_user_capabilities
--
-- purpose:
--   make the panel and the capability gate agree on what a tester
--   (or admin) can use.
--
--   payments.user_capabilities(target_user_id) is the canonical public
--   API that drives both the JWT user_capabilities claim (via the
--   custom_access_token_hook) and the frontend panel. before this
--   migration it only unioned plan_capabilities with
--   default_capabilities — neither knows about user_roles. so a
--   tester with no subscription saw only the default capabilities in
--   the panel, even though ROLE_BYPASS in
--   supabase/functions/_shared/capabilities.ts:53 lets them call any
--   capability server-side. the panel lied about what the user
--   could actually use.
--
--   this migration adds a third union branch: usage_limits_role rows
--   that match the target user's role. with this branch, a tester
--   sees every capability that has a role:tester row in
--   usage_limits_role (which is the source of truth for what the
--   resolver actually allows).
--
-- affected functions:
--   replace: payments.user_capabilities
--
-- affected rows: none. pure code change; no data migration needed.
--
-- special considerations:
--   * the per-user gate (auth.uid() <> target_user_id -> 42501) is
--     preserved verbatim — callers may only query their own caps.
--   * the grants (EXECUTE to authenticated + service_role) are
--     preserved verbatim.
--   * the new branch uses the same usage_limits_role table the
--     resolver reads, so the panel and the resolver can never drift
--     apart on which role grants exist.
--   * admin rows: there are no admin rows in usage_limits_role today
--     (admin bypasses every call site, not just specific caps), so
--     the admin panel stays empty unless we seed role:admin rows
--     later. if we do, this branch will pick them up automatically.

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
  -- per-user gate (unchanged from 20260705150533):
  --   * authenticated caller  -> may only query their own user_id
  --   * service_role / postgres -> auth.uid() is null, gate skipped
  --   * anon                  -> no EXECUTE grant, never reaches here
  if auth.uid() is not null and target_user_id <> auth.uid() then
    raise exception
      'forbidden: cannot query capabilities for another user'
      using errcode = '42501';
  end if;

  -- three-way union, deduped:
  --   (a) plan_capabilities joined with active subscriptions
  --   (b) default_capabilities (user_id is null branch)
  --   (c) usage_limits_role rows for this user's role
  --
  -- branch (c) mirrors the ROLE_BYPASS in
  -- supabase/functions/_shared/capabilities.ts:53-56 so the panel
  -- and the capability gate stay in sync. without it a tester sees
  -- only the defaults in the panel even though the gate lets them
  -- call every capability with a usage_limits_role row.
  select coalesce(
    array_agg(distinct capability),
    '{}'::payments.capability[]
  )
    into caps
  from (
    select capability
      from payments.user_capabilities_v
     where user_id = target_user_id
        or user_id is null
    union
    select r.capability
      from payments.usage_limits_role r
      join public.user_roles ur on ur.role = r.role
     where ur.user_id = target_user_id
  ) merged;

  return caps;
end;
$$;

comment on function payments.user_capabilities(uuid) is
  'canonical public API to read a user''s capability set. SECURITY DEFINER so the function can read payments.user_capabilities_v (which is revoked from authenticated). returns the union of: subscription grants (plan_capabilities), default grants (default_capabilities), and role-scoped limits (usage_limits_role rows matching the user''s role). the role branch mirrors the ROLE_BYPASS in _shared/capabilities.ts so the panel and the capability gate stay in sync. authenticated callers may only query their own user_id; service_role bypasses the per-user gate.';
