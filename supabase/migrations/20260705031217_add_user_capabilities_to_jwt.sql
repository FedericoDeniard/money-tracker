-- migration: add_user_capabilities_to_jwt
--
-- purpose:
--   extend custom_access_token_hook to inject the user's current capability
--   set as a `user_capabilities` claim on the access token. the set is the
--   union of capabilities across all of the user's active subscriptions.
--
-- why this exists alongside requireCapability (db-verified):
--   * jwt claim = ui hint (frontend, mastra-server, non-gating edge
--     functions): zero-latency reads, optimistic about the user's plan.
--   * requireCapability in edge functions = security boundary: always
--     re-queries payments.subscriptions + plan_capabilities, so a plan
--     expiry triggers a 403 on the very next gated call without needing
--     to wait for a token refresh.
--   see packages/frontend/src/lib/capabilities.ts and
--   supabase/functions/_shared/capabilities.ts for the consumers.
--
-- design notes:
--   * the hook is recreated as create or replace so this migration is
--     idempotent and can be applied on top of
--     20260625125528_add_user_roles_and_access_token_hook.sql which
--     already created the function.
--   * capability set is derived from payments.subscriptions joined with
--     payments.plan_capabilities, filtered to statuses that grant
--     entitlements. statuses: authorized, pending (pre-approval flow),
--     paused (temporarily suspended but still entitled), pending_cancellation
--     (user requested cancel; retains entitlements until end of billing
--     period).
--   * `array_agg(distinct ...)` returns null when no active subscriptions
--     exist; coalesce to '{}' so the claim is always an array.
--   * `distinct` is defensive: the hook takes the union across all
--     subscriptions, but a user could in principle hold two subscriptions
--     on the same plan. we don't want duplicated capabilities.
--   * the function remains `stable` because for the same input event it
--     returns the same value within a single statement.
--
-- affected functions:
--   public.custom_access_token_hook(jsonb) — recreated.
-- affected tables (read-only from the hook):
--   payments.subscriptions
--   payments.plan_capabilities
--   public.user_roles (unchanged from previous migration)

-- 1. recreate the hook with the same shape, adding the user_capabilities
--    claim. structure mirrors the existing user_role injection exactly:
--    read from the table, fall back to a safe default if nothing is
--    found, jsonb_set the claim onto the event.
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
  -- 1a. role (unchanged from the original hook)
  select ur.role
    into user_role
    from public.user_roles ur
   where ur.user_id = (event->>'user_id')::uuid
   order by ur.role  -- deterministic when a user somehow has multiple roles
   limit 1;

  if user_role is null then
    user_role := 'user';
  end if;

  -- 1b. capabilities: union of capabilities across all active subscriptions.
  --     inner join on plan_capabilities ensures subscriptions whose plan
  --     has zero capabilities are silently excluded (a free plan with no
  --     row in plan_capabilities contributes nothing, which is correct).
  --     statuses mirror what requireCapability accepts in the edge layer
  --     so the jwt claim and the security boundary stay in sync.
  select array_agg(distinct pc.capability)
    into user_caps
    from payments.subscriptions s
    join payments.plan_capabilities pc on pc.plan_id = s.plan_id
   where s.user_id = (event->>'user_id')::uuid
     and s.status in (
       'authorized',
       'pending',
       'paused',
       'pending_cancellation'
     );

  -- 1c. write both claims onto the event
  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}',         to_jsonb(user_role));
  claims := jsonb_set(claims, '{user_capabilities}', to_jsonb(coalesce(user_caps, '{}')));
  event  := jsonb_set(event,  '{claims}', claims);

  return event;
end;
$$;

-- 2. permissions unchanged from the original migration. the hook is owned
--    by supabase and only supabase_auth_admin can execute it.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated;
revoke execute on function public.custom_access_token_hook(jsonb) from anon;
revoke execute on function public.custom_access_token_hook(jsonb) from public;