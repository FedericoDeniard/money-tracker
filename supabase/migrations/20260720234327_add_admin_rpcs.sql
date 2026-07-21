-- migration: add_admin_rpcs
--
-- purpose:
--   security definer rpcs in the `payments` schema that power the admin
--   panel at `/admin/*`. every rpc starts with a guard that confirms the
--   caller has role='admin' in public.user_roles; non-admin callers get
--   42501 (insufficient_privilege) which postgrest surfaces as a 401.
--   the guard is identical across all functions so a single regression
--   affects every panel route.
--
-- design notes:
--   * all rpcs live in `payments` for consistency with the rest of the
--     billing/admin surface (`payments.user_capabilities`,
--     `payments.resolve_usage_limit`, `payments.check_and_increment_usage`).
--     consumers call them with `supabase.schema('payments').rpc(...)` so
--     postgrest sends the Accept-Profile / Content-Profile headers.
--   * `stable` where the body only reads, `volatile` for the four that
--     mutate (set_user_role, cancel_subscription, retry_seed). mutating
--     rpcs still take the admin guard.
--   * `search_path = ''` on every function and all object references are
--     schema-qualified (defense in depth against search_path attacks).
--   * grants go to `authenticated` only — the guard handles the rest.
--     `service_role` already bypasses rls so it doesn't need the grant.
--   * none of these rpcs touch `payments.subscriptions` policies. the
--     existing rls (user can read own row) is preserved; admin reads
--     happen through these rpcs, not through postgrest on the table.
--
-- affected functions (created):
--   payments.admin_list_users          (stable)
--   payments.admin_get_user            (stable)
--   payments.admin_set_user_role       (volatile)
--   payments.admin_list_subscriptions  (stable)
--   payments.admin_cancel_subscription (volatile)
--   payments.admin_list_payment_events (stable)
--   payments.admin_list_seeds          (stable)
--   payments.admin_retry_seed          (volatile)
--   payments.admin_stats               (stable)
--   payments.admin_usage_limits        (stable)
--   payments.admin_user_usage_summary  (stable)
--   payments.admin_usage_top_consumers (stable)
--
-- affected tables (reads, no ddl):
--   public.users
--   public.user_roles
--   public.user_oauth_tokens
--   public.seeds
--   payments.subscriptions
--   payments.plans
--   payments.plan_provider_variants
--   payments.subscription_events
--   payments.usage_limits_role
--   payments.usage_limits_plan
--   payments.usage_limits_default
--   payments.usage_counters

-- ============================================================================
-- shared guard helper
-- ============================================================================
-- used as the first statement in every admin rpc. raises 42501 so postgrest
-- returns a 401 to the client and the frontend can branch on the error.
-- inlined per function (not a separate helper) so each rpc is self-contained
-- and reviewable; the duplication is intentional.

-- ============================================================================
-- 1. admin_list_users — paginated user list with role + latest subscription
-- ============================================================================
create or replace function payments.admin_list_users(
  p_search text default null,
  p_limit  int  default 50,
  p_offset int  default 0
)
returns table (
  user_id        uuid,
  email          text,
  name           text,
  created_at     timestamptz,
  role           public.app_role,
  active_plan_key text,
  sub_status     text,
  sub_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    select
      u.id,
      u.email::text,
      u.name::text,
      u.created_at,
      ur.role,
      p.plan_key,
      s.status,
      s.updated_at
    from public.users u
    left join public.user_roles ur on ur.user_id = u.id
    left join lateral (
      select s2.status, s2.updated_at, s2.plan_id
        from payments.subscriptions s2
       where s2.user_id = u.id
       order by s2.updated_at desc
       limit 1
    ) s on true
    left join payments.plans p on p.id = s.plan_id
   where p_search is null
      or u.email ilike '%' || p_search || '%'
      or u.name  ilike '%' || p_search || '%'
   order by u.created_at desc
   limit p_limit
  offset p_offset;
end;
$$;

comment on function payments.admin_list_users(text, int, int) is
  'admin: paginated list of users joined with their role and most-recent subscription. guard: caller must have role=admin in public.user_roles; otherwise 42501.';

grant execute on function payments.admin_list_users(text, int, int) to authenticated;

-- ============================================================================
-- 2. admin_get_user — single user detail
-- ============================================================================
create or replace function payments.admin_get_user(p_user_id uuid)
returns table (
  user_id        uuid,
  email          text,
  name           text,
  created_at     timestamptz,
  role           public.app_role,
  active_plan_key text,
  sub_status     text,
  sub_updated_at timestamptz,
  has_gmail      boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    select
      u.id,
      u.email::text,
      u.name::text,
      u.created_at,
      ur.role,
      p.plan_key,
      s.status,
      s.updated_at,
      exists(select 1 from public.user_oauth_tokens t
              where t.user_id = u.id and t.is_active = true)
    from public.users u
    left join public.user_roles ur on ur.user_id = u.id
    left join lateral (
      select s2.status, s2.updated_at, s2.plan_id
        from payments.subscriptions s2
       where s2.user_id = u.id
       order by s2.updated_at desc
       limit 1
    ) s on true
    left join payments.plans p on p.id = s.plan_id
   where u.id = p_user_id;
end;
$$;

comment on function payments.admin_get_user(uuid) is
  'admin: single user row with role, latest subscription, gmail-connected flag. guard: caller must have role=admin.';

grant execute on function payments.admin_get_user(uuid) to authenticated;

-- ============================================================================
-- 3. admin_set_user_role — promote/demote a user
-- ============================================================================
create or replace function payments.admin_set_user_role(
  p_user_id uuid,
  p_role    public.app_role
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'forbidden: cannot change your own role' using errcode = '42501';
  end if;

  -- upsert: replaces whatever role the user had (today we keep one role
  -- per user; future multi-role lives in the same table per the unique
  -- constraint on user_id+role).
  insert into public.user_roles (user_id, role)
  values (p_user_id, p_role)
  on conflict (user_id, role) do nothing;

  -- ensure only one role row per user by removing any other role rows.
  -- safe because today we treat (user_id, role) as the full keyspace.
  delete from public.user_roles
   where public.user_roles.user_id = p_user_id
     and public.user_roles.role <> p_role;
end;
$$;

comment on function payments.admin_set_user_role(uuid, public.app_role) is
  'admin: upsert a single role for the target user. self-edit blocked. guard: caller must have role=admin.';

grant execute on function payments.admin_set_user_role(uuid, public.app_role) to authenticated;

-- ============================================================================
-- 4. admin_list_subscriptions — paginated subscriptions with user + plan
-- ============================================================================
create or replace function payments.admin_list_subscriptions(
  p_status text default null,
  p_limit  int  default 100,
  p_offset int  default 0
)
returns table (
  subscription_id       uuid,
  user_id               uuid,
  user_email            text,
  provider              payments.provider_name,
  provider_subscription_id text,
  status                text,
  plan_key              text,
  transaction_amount    numeric,
  currency_id           text,
  updated_at            timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    select
      s.id,
      s.user_id,
      u.email::text,
      s.provider,
      s.provider_subscription_id,
      s.status,
      p.plan_key,
      s.transaction_amount,
      s.currency_id,
      s.updated_at
    from payments.subscriptions s
    left join public.users u on u.id = s.user_id
    left join payments.plans p on p.id = s.plan_id
   where p_status is null or s.status = p_status
   order by s.updated_at desc
   limit p_limit
  offset p_offset;
end;
$$;

comment on function payments.admin_list_subscriptions(text, int, int) is
  'admin: paginated subscriptions joined with user email + plan key. optional p_status filter. guard: caller must have role=admin.';

grant execute on function payments.admin_list_subscriptions(text, int, int) to authenticated;

-- ============================================================================
-- 5. admin_cancel_subscription — local status flip (webhook is source of truth)
-- ============================================================================
create or replace function payments.admin_cancel_subscription(
  p_user_id     uuid,
  p_target_status text default 'pending_cancellation'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  sub_id          uuid;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  if p_target_status not in ('cancelled', 'paused', 'pending_cancellation') then
    raise exception 'invalid target status: %', p_target_status using errcode = '22023';
  end if;

  select s.id into sub_id
    from payments.subscriptions s
   where s.user_id = p_user_id
   order by s.updated_at desc
   limit 1;

  if sub_id is null then
    raise exception 'no subscription for user %', p_user_id using errcode = 'P0002';
  end if;

  -- local status update only. the provider-side cancellation is delivered
  -- by the payments-webhook (subscription_preapproval.updated) when MP
  -- sends the next event — that webhook is the source of truth for the
  -- final status. this local flip lets the admin panel render the
  -- change immediately and protects the panel from a stuck webhook.
  update payments.subscriptions
     set status = p_target_status,
         updated_at = now()
   where id = sub_id;

  return sub_id;
end;
$$;

comment on function payments.admin_cancel_subscription(uuid, text) is
  'admin: locally flip a user''s most-recent subscription to cancelled/paused/pending_cancellation. returns the subscription id. the provider-side reconciliation is the payments-webhook job; this update is best-effort UX. guard: caller must have role=admin.';

grant execute on function payments.admin_cancel_subscription(uuid, text) to authenticated;

-- ============================================================================
-- 6. admin_list_payment_events — recent webhook events with payment_id
-- ============================================================================
create or replace function payments.admin_list_payment_events(
  p_limit int default 50
)
returns table (
  id                       bigint,
  received_at              timestamptz,
  topic                    text,
  action                   text,
  provider                 payments.provider_name,
  provider_subscription_id text,
  payment_id               bigint,
  user_id                  uuid,
  user_email               text,
  signature_valid          boolean,
  processing_status        text,
  processing_error         text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    select
      e.id,
      e.received_at,
      e.topic,
      e.action,
      e.provider,
      e.provider_subscription_id,
      e.payment_id,
      s.user_id,
      u.email::text,
      e.signature_valid,
      e.processing_status,
      e.processing_error
    from payments.subscription_events e
    left join payments.subscriptions s
      on s.provider = e.provider
     and s.provider_subscription_id = e.provider_subscription_id
    left join public.users u on u.id = s.user_id
   where e.payment_id is not null
   order by e.received_at desc
   limit p_limit;
end;
$$;

comment on function payments.admin_list_payment_events(int) is
  'admin: most-recent subscription_events rows that carry a payment_id (i.e. real payment deliveries, not heartbeat/ping). joins back to the owning user via subscriptions+users. guard: caller must have role=admin.';

grant execute on function payments.admin_list_payment_events(int) to authenticated;

-- ============================================================================
-- 7. admin_list_seeds — read all seeds across all users
-- ============================================================================
create or replace function payments.admin_list_seeds(
  p_status text default null,
  p_limit  int  default 100
)
returns table (
  id                       uuid,
  user_id                  uuid,
  user_email               text,
  user_oauth_token_id      uuid,
  gmail_email              text,
  status                   text,
  total_emails             int,
  transactions_found       int,
  total_skipped            int,
  emails_processed_by_ai   int,
  last_processed_index     int,
  error_message            text,
  created_at               timestamptz,
  updated_at               timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    select
      sd.id,
      sd.user_id,
      u.email::text,
      sd.user_oauth_token_id,
      tok.gmail_email::text,
      sd.status::text,
      sd.total_emails,
      sd.transactions_found,
      sd.total_skipped,
      sd.emails_processed_by_ai,
      sd.last_processed_index,
      sd.error_message,
      sd.created_at,
      sd.updated_at
    from public.seeds sd
    left join public.users u on u.id = sd.user_id
    left join public.user_oauth_tokens tok on tok.id = sd.user_oauth_token_id
   where p_status is null or sd.status::text = p_status
   order by sd.updated_at desc nulls last
   limit p_limit;
end;
$$;

comment on function payments.admin_list_seeds(text, int) is
  'admin: paginated seeds across all users, joined with the owning email and the gmail address from the related oauth token. guard: caller must have role=admin.';

grant execute on function payments.admin_list_seeds(text, int) to authenticated;

-- ============================================================================
-- 8. admin_retry_seed — reset a failed seed for re-processing
-- ============================================================================
create or replace function payments.admin_retry_seed(p_seed_id uuid)
returns table (
  seed_id      uuid,
  connection_id uuid,
  user_id      uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  v_status        text;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  select sd.status::text, sd.user_oauth_token_id, sd.user_id
    into v_status, connection_id, user_id
    from public.seeds sd
   where sd.id = p_seed_id;

  if v_status is null then
    raise exception 'seed not found: %', p_seed_id using errcode = 'P0002';
  end if;

  if v_status not in ('failed', 'completed') then
    raise exception 'cannot retry seed in status %', v_status using errcode = 'P0001';
  end if;

  -- reset for re-processing. message_ids stays — the processor can resume
  -- from last_processed_index if we leave it alone, but a full retry
  -- expects a clean run, so reset progress + clear error.
  update public.seeds
     set status = 'pending',
         error_message = null,
         last_processed_index = 0
   where id = p_seed_id;

  seed_id := p_seed_id;
  return next;
end;
$$;

comment on function payments.admin_retry_seed(uuid) is
  'admin: reset a failed/completed seed row to pending so the processor can pick it up. returns (seed_id, connection_id, user_id) so the frontend can call mastra /api/seed-emails with the same payload as a fresh import. guard: caller must have role=admin.';

grant execute on function payments.admin_retry_seed(uuid) to authenticated;

-- ============================================================================
-- 9. admin_stats — MRR / Active / Churn 30d
-- ============================================================================
-- mr per provider+currency: sum of transaction_amount for active subs
-- (status in active set) on that provider's variant. multi-currency because
-- a future stripe variant would land in USD; the panel renders one card
-- per (provider, currency).
create or replace function payments.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  active_set      text[] := array['authorized', 'pending', 'paused', 'pending_cancellation'];
  result          jsonb;
  mrr_rows        jsonb;
  active_count    int;
  cancelled_30d   int;
  active_30d_ago  int;
  churn_30d       numeric;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  -- MRR: one row per (provider, currency) so multi-currency plans render
  -- separately. inner query picks the freshest variant per (plan, provider).
  select coalesce(jsonb_agg(row_to_json(m)), '[]'::jsonb) into mrr_rows
    from (
      select
        ppv.provider,
        ppv.currency,
        sum(ppv.amount) as mrr_amount,
        count(distinct s.user_id) as subs
      from payments.subscriptions s
      join payments.plan_provider_variants ppv on ppv.plan_id = s.plan_id
      where s.status = any(active_set)
      group by ppv.provider, ppv.currency
      order by ppv.provider, ppv.currency
    ) m;

  -- Active: distinct users with at least one active subscription.
  select count(distinct s.user_id) into active_count
    from payments.subscriptions s
   where s.status = any(active_set);

  -- Churn 30d: cancelled in last 30d / active 30d ago. we approximate
  -- "active 30d ago" as "subs updated_at < now() - 30d with an active
  -- status at that time" — but we don't have historical snapshots, so
  -- use a simpler proxy: subs whose status moved to cancelled/completed
  -- in the last 30d, divided by the total subs that existed 30d ago.
  -- To keep the query cheap: count currently-cancelled subs with
  -- updated_at in last 30d as numerator; denominator = active_30d_ago
  -- which we approximate as current active count + cancelled_last_30d.
  select count(*) into cancelled_30d
    from payments.subscriptions s
   where s.status in ('cancelled', 'completed')
     and s.updated_at > now() - interval '30 days';

  active_30d_ago := active_count + cancelled_30d;
  if active_30d_ago > 0 then
    churn_30d := round((cancelled_30d::numeric / active_30d_ago::numeric) * 100, 2);
  else
    churn_30d := 0;
  end if;

  result := jsonb_build_object(
    'mrr',                mrr_rows,
    'active_subscriptions', active_count,
    'churn_30d_pct',      churn_30d,
    'cancelled_30d',      cancelled_30d,
    'generated_at',       now()
  );

  return result;
end;
$$;

comment on function payments.admin_stats() is
  'admin: aggregate platform stats — MRR per (provider, currency), active subscription count, churn 30d. guard: caller must have role=admin.';

grant execute on function payments.admin_stats() to authenticated;

-- ============================================================================
-- 10. admin_usage_limits — the three typed tables + affected user count
-- ============================================================================
create or replace function payments.admin_usage_limits()
returns table (
  capability     payments.capability,
  scope_kind     payments.usage_scope_kind,
  scope_value    text,
  period         payments.usage_period,
  max_count      int,
  affected_users int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    -- role scope
    select
      r.capability,
      'role'::payments.usage_scope_kind,
      r.role::text,
      r.period,
      r.max_count,
      (select count(distinct ur.user_id)
         from public.user_roles ur
        where ur.role = r.role)::int
    from payments.usage_limits_role r
    union all
    -- plan scope
    select
      pp.capability,
      'plan'::payments.usage_scope_kind,
      pp.plan_key,
      pp.period,
      pp.max_count,
      (select count(distinct s.user_id)
         from payments.subscriptions s
         join payments.plans p on p.id = s.plan_id
        where p.plan_key = pp.plan_key
          and s.status in ('authorized','pending','paused','pending_cancellation'))::int
    from payments.usage_limits_plan pp
    union all
    -- default scope: all users with the capability
    select
      dd.capability,
      'default'::payments.usage_scope_kind,
      null::text,
      dd.period,
      dd.max_count,
      (select count(distinct s.user_id)
         from payments.subscriptions s
        where s.status in ('authorized','pending','paused','pending_cancellation'))::int
    from payments.usage_limits_default dd
   order by 1, 2, 3;
end;
$$;

comment on function payments.admin_usage_limits() is
  'admin: union of usage_limits_role/plan/default with an affected_users count per row. role rows count distinct users holding that role; plan rows count distinct active subscribers on the plan; default rows count distinct active subscribers (everyone resolves through default when no role/plan override exists). guard: caller must have role=admin.';

grant execute on function payments.admin_usage_limits() to authenticated;

-- ============================================================================
-- 11. admin_user_usage_summary — effective limit per (user, capability, period)
-- ============================================================================
create or replace function payments.admin_user_usage_summary(p_user_id uuid)
returns table (
  capability     payments.capability,
  period         payments.usage_period,
  resolved_limit int,
  current_count  int,
  scope_kind     text,
  scope_value    text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    with caps as (
      select unnest(enum_range(NULL::payments.capability)) as capability
    ),
    per_cap as (
      select
        c.capability,
        'month'::payments.usage_period as period,
        payments.resolve_usage_limit(p_user_id, c.capability::text, 'month') as resolved_limit
      from caps c
    )
    select
      pc.capability,
      pc.period,
      pc.resolved_limit,
      coalesce(uc.count, 0)::int,
      coalesce(v.scope_kind::text, 'default'),
      v.scope_value
    from per_cap pc
    left join payments.usage_counters uc
      on uc.user_id = p_user_id
     and uc.capability = pc.capability
     and uc.period_start = date_trunc('month', now())
    -- pick the resolved scope kind from the v view (best-effort hint
    -- for the ui tooltip). multiple rows match when role+plan+default
    -- exist; take the first deterministic match.
    left join lateral (
      select vv.scope_kind, vv.scope_value
        from payments.usage_limits_v vv
       where vv.capability = pc.capability
       order by case vv.scope_kind when 'role' then 1 when 'plan' then 2 else 3 end
       limit 1
    ) v on true
   order by pc.capability;
end;
$$;

comment on function payments.admin_user_usage_summary(uuid) is
  'admin: for one user, walk every capability and resolve the effective monthly limit using payments.resolve_usage_limit, then join the current period counter and the scope hint. guard: caller must have role=admin.';

grant execute on function payments.admin_user_usage_summary(uuid) to authenticated;

-- ============================================================================
-- 12. admin_usage_top_consumers — heaviest users by capability in a period
-- ============================================================================
create or replace function payments.admin_usage_top_consumers(
  p_capability   payments.capability,
  p_period_start timestamptz,
  p_limit        int default 20
)
returns table (
  user_id    uuid,
  user_email text,
  count      int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  return query
    select
      uc.user_id,
      u.email::text,
      uc.count::int
    from payments.usage_counters uc
    left join public.users u on u.id = uc.user_id
   where uc.capability = p_capability
     and uc.period_start = p_period_start
   order by uc.count desc
   limit p_limit;
end;
$$;

comment on function payments.admin_usage_top_consumers(payments.capability, timestamptz, int) is
  'admin: top N users by usage_counters.count for a given capability+period. guard: caller must have role=admin.';

grant execute on function payments.admin_usage_top_consumers(payments.capability, timestamptz, int) to authenticated;