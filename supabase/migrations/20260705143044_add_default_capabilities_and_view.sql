-- migration: add_default_capabilities_and_view
--
-- purpose:
--   decouple "is this user entitled to capability X" from "does this
--   user have an active paid subscription". today the only way to
--   grant a capability to a free user is to insert a 'free' row in
--   payments.plans, which would conflict with the FREE_PLAN constant
--   hardcoded in the frontend pricing grid (packages/frontend/src/
--   services/pricing.ts) and require a refactor to disambiguate.
--
--   this migration introduces a three-layer capability model:
--     1. payments.default_capabilities — single-column table listing
--        capabilities granted to every authenticated user
--        regardless of subscription. service_role writes only;
--        authenticated can select (mirrors the plan_capabilities
--        pattern).
--     2. payments.user_capabilities_v — a UNION view that joins
--        active subscription grants with the default grants. NULL
--        user_id in the default branch means the row applies to
--        everyone; consumers can either filter by their uuid OR
--        use `user_id is null` to enumerate the default set.
--     3. public.custom_access_token_hook (recreated below) sources
--        user_capabilities from the view so the JWT hint and the
--        security boundary (requireCapability in edge functions and
--        the mastra-server chat handler) cannot drift — they read
--        the same SQL.
--
--   the table starts empty: no free-tier capability is granted by
--   default. to grant a capability to all users without a
--   subscription, insert into payments.default_capabilities:
--     INSERT INTO payments.default_capabilities VALUES ('ai_assistant');
--   no code change required. the union with plan_capabilities means
--   paid users keep their explicit grants; the only effect of adding
--   a default is that free users also get it.
--
-- affected tables:
--   new:  payments.default_capabilities
--   new view: payments.user_capabilities_v
--   modified: public.custom_access_token_hook (recreated)
--
-- affected rows: none on first apply (table is empty).
--
-- special considerations:
--   * the view has no primary key. PostgREST still serves simple
--     SELECTs against views without one; if a future use case needs
--     INSERT/UPDATE/DELETE we'd add an INSTEAD OF trigger or a real
--     table. Today every consumer only reads.
--   * the recreated hook does NOT add SECURITY DEFINER. it relies
--     on the grants added in
--     20260705050715_grant_payments_access_to_auth_hook.sql which
--     give supabase_auth_admin SELECT on the payments tables and
--     USAGE on the schema. adding SECURITY DEFINER is a separate
--     hardening step if/when those grants ever prove fragile.
--   * the active subscription statuses are duplicated from the
--     inline WHERE in the original hook (see
--     20260705031217_add_user_capabilities_to_jwt.sql). keep in
--     sync if a new status is ever added to the payments.subscriptions
--     lifecycle.

-- 1. default capabilities table
create table payments.default_capabilities (
  capability payments.capability primary key,
  created_at timestamptz not null default now()
);

comment on table payments.default_capabilities is
  'capabilities granted to every authenticated user regardless of subscription. consumed by payments.user_capabilities_v (which feeds the auth hook jwt claim) and by requireCapability (the security boundary in edge functions and the mastra-server chat handler).';

-- 2. grants: read for authenticated and for the auth hook's caller
grant select on payments.default_capabilities to authenticated;
grant select on payments.default_capabilities to supabase_auth_admin;

-- 3. union view. user_id = null means "applies to everyone" — used by
--    the auth hook via `or(user_id.eq.<uuid>, user_id.is.null)` and by
--    requireCapability the same way. duplicate (plan_id, capability)
--    pairs in plan_capabilities are deduped via union.
create or replace view payments.user_capabilities_v as
with active_grants as (
  select distinct s.user_id, pc.capability
  from payments.subscriptions s
  join payments.plan_capabilities pc on pc.plan_id = s.plan_id
  where s.status in (
    'authorized',
    'pending',
    'paused',
    'pending_cancellation'
  )
),
default_grants as (
  select cast(null as uuid) as user_id, capability
  from payments.default_capabilities
)
select user_id, capability from active_grants
union
select user_id, capability from default_grants;

comment on view payments.user_capabilities_v is
  'union of capabilities granted by an active subscription (user_id = the user) and the default grants (user_id = null, applies to everyone). consumers (the auth hook for jwt hints, requireCapability for the security boundary) filter via `or(user_id.eq.<uuid>, user_id.is.null)`.';

grant select on payments.user_capabilities_v to authenticated;
grant select on payments.user_capabilities_v to supabase_auth_admin;

-- 4. recreate the hook to source user_capabilities from the view.
--    replaces the version from
--    20260705031217_add_user_capabilities_to_jwt.sql which inlined
--    the subscription join. behavior is the same for users with an
--    active subscription; the only addition is that the NULL-row
--    branch of the view contributes default capabilities to the
--    claim.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public.app_role;
  user_caps text[];
begin
  select ur.role
    into user_role
    from public.user_roles ur
   where ur.user_id = (event->>'user_id')::uuid
   order by ur.role
   limit 1;

  if user_role is null then
    user_role := 'user';
  end if;

  select array_agg(distinct capability)
    into user_caps
    from payments.user_capabilities_v
   where user_id = (event->>'user_id')::uuid
      or user_id is null;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}',         to_jsonb(user_role));
  claims := jsonb_set(claims, '{user_capabilities}', to_jsonb(coalesce(user_caps, '{}')));
  event  := jsonb_set(event,  '{claims}', claims);

  return event;
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated;
revoke execute on function public.custom_access_token_hook(jsonb) from anon;
revoke execute on function public.custom_access_token_hook(jsonb) from public;