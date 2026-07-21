-- migration: add_pagination_to_admin_list_seeds_and_events
--
-- purpose:
--   the MON-11 admin panel shipped with hardcoded `limit: 100` (seeds)
--   and `limit: 50` (payments) and no UI pagination — fine for early
--   data but breaks once a real userbase accumulates hundreds of rows.
--   add `p_offset` to admin_list_seeds and admin_list_payment_events
--   so the admin panel can iterate pages, plus a new
--   admin_count_seeds(admin) / admin_count_payment_events(admin) for
--   the total row count the panel needs to render "1-25 of 423".
--
-- design notes:
--   * admin_list_users, admin_list_subscriptions and admin_usage_limits
--     already accept p_offset / p_limit — no schema change needed for
--     them. the frontend hook layer already exposes pagination params
--     for those, the UI is the only gap.
--   * admin_list_payment_events only takes p_limit today; the events
--     table grows quickly (one row per webhook delivery) so pagination
--     is even more important here.
--   * count rpcs mirror the list rpc's WHERE clause exactly so the
--     total matches what the list returns.
--   * same admin guard as every other rpc in the payments.admin_*
--     family (see 20260720234327_add_admin_rpcs.sql for the pattern).
--
-- affected functions:
--   replace: payments.admin_list_seeds          (adds p_offset)
--   replace: payments.admin_list_payment_events (adds p_offset)
--   create:  payments.admin_count_seeds         (stable)
--   create:  payments.admin_count_payment_events(stable)
--
-- affected tables (reads, no ddl):
--   public.seeds
--   payments.subscription_events

-- ============================================================================
-- 1. admin_list_seeds — add p_offset
-- ============================================================================
create or replace function payments.admin_list_seeds(
  p_status text default null,
  p_limit  int  default 25,
  p_offset int  default 0
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
   limit p_limit
  offset p_offset;
end;
$$;

comment on function payments.admin_list_seeds(text, int, int) is
  'admin: paginated seeds across all users, joined with the owning email and the gmail address from the related oauth token. guard: caller must have role=admin.';

grant execute on function payments.admin_list_seeds(text, int, int) to authenticated;

-- ============================================================================
-- 2. admin_count_seeds — total matching the same filter
-- ============================================================================
create or replace function payments.admin_count_seeds(p_status text default null)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  total           bigint;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  select count(*) into total
    from public.seeds sd
   where p_status is null or sd.status::text = p_status;

  return total;
end;
$$;

comment on function payments.admin_count_seeds(text) is
  'admin: total seed count for the same status filter as admin_list_seeds; used by the admin panel pagination control. guard: caller must have role=admin.';

grant execute on function payments.admin_count_seeds(text) to authenticated;

-- ============================================================================
-- 3. admin_list_payment_events — add p_offset
-- ============================================================================
create or replace function payments.admin_list_payment_events(
  p_limit  int default 50,
  p_offset int default 0
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
   order by e.received_at desc nulls last
   limit p_limit
  offset p_offset;
end;
$$;

comment on function payments.admin_list_payment_events(int, int) is
  'admin: most-recent subscription_events rows that carry a payment_id (i.e. real payment deliveries, not heartbeat/ping). joins back to the owning user via subscriptions+users. guard: caller must have role=admin.';

grant execute on function payments.admin_list_payment_events(int, int) to authenticated;

-- ============================================================================
-- 4. admin_count_payment_events — total
-- ============================================================================
create or replace function payments.admin_count_payment_events()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  total           bigint;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  select count(*) into total
    from payments.subscription_events e
   where e.payment_id is not null;

  return total;
end;
$$;

comment on function payments.admin_count_payment_events() is
  'admin: total payment_events with payment_id IS NOT NULL — used by the admin panel pagination control. guard: caller must have role=admin.';

grant execute on function payments.admin_count_payment_events() to authenticated;

-- ============================================================================
-- 5. admin_count_users — total matching the same filter as admin_list_users
-- ============================================================================
-- mirrors the WHERE clause in admin_list_users: optional email/name ILIKE
-- search. the active subscription join in the list query is not part of the
-- count because the count asks "how many users exist that match this
-- search", not "how many users have an active subscription".
create or replace function payments.admin_count_users(p_search text default null)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  total           bigint;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  select count(*) into total
    from public.users u
   where p_search is null
      or u.email ilike '%' || p_search || '%'
      or u.name  ilike '%' || p_search || '%';

  return total;
end;
$$;

comment on function payments.admin_count_users(text) is
  'admin: count of users matching the same search filter as admin_list_users. guard: caller must have role=admin.';

grant execute on function payments.admin_count_users(text) to authenticated;

-- ============================================================================
-- 6. admin_count_subscriptions — total matching the same status filter
-- ============================================================================
create or replace function payments.admin_count_subscriptions(p_status text default null)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
  total           bigint;
begin
  select exists(
    select 1 from public.user_roles
     where public.user_roles.user_id = auth.uid() and public.user_roles.role = 'admin'
  ) into caller_is_admin;

  if not caller_is_admin then
    raise exception 'forbidden: admin only' using errcode = '42501';
  end if;

  select count(*) into total
    from payments.subscriptions s
   where p_status is null or s.status = p_status;

  return total;
end;
$$;

comment on function payments.admin_count_subscriptions(text) is
  'admin: count of subscriptions matching the same status filter as admin_list_subscriptions. guard: caller must have role=admin.';

grant execute on function payments.admin_count_subscriptions(text) to authenticated;