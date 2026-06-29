-- migration: create_subscriptions_schema
-- purpose: introduce the `payments` schema and the provider-agnostic tables
--          that hold subscription state and webhook audit log.
--          alpha scope: no entitlements, no plan enforcement, no user-facing
--          impact beyond the webhook handler. future providers (stripe, etc.)
--          reuse these tables without schema changes — only an `alter type
--          payments.provider_name add value '<provider>'` and a new module
--          under _shared/lib/payments/<provider>/.
-- affected schemas: payments
-- affected tables: payments.subscription_plans, payments.subscriptions,
--                  payments.subscription_events, payments.provider_name (enum)
-- special considerations:
--   * service_role bypasses rls (used by edge functions).
--   * payments.subscriptions: users can read their own row (auth.uid() policy);
--     writes only via service_role.
--   * payments.subscription_events: audit-only, no user access.
--   * payments.subscription_plans: public catalog. authenticated can read rows
--     where is_active = true; writes are service_role only.
--   * upserts keyed on (provider, provider_subscription_id) absorb webhook retries.
--   * realtime broadcast: trigger on subscriptions emits to a per-user channel
--     payments:subscriptions:<user_id>. RLS on realtime.messages restricts
--     receive to the owning user.

-- =============================================================================
-- 1. schema + grants
-- =============================================================================

create schema if not exists payments;

grant usage on schema payments to authenticated, anon, service_role;

-- =============================================================================
-- 2. provider_name enum
-- =============================================================================
-- discriminated by the third-party billing provider. extend with
--   alter type payments.provider_name add value '<provider>';
-- when a new provider is integrated. requires a separate transaction
-- because postgres enums cannot be modified in the same transaction they
-- are used.

create type payments.provider_name as enum ('mercadopago');

grant usage on type payments.provider_name to authenticated;

-- =============================================================================
-- 3. subscription_plans: catalog of plans this app sells
-- =============================================================================
-- decoupled from any provider: each row binds an internal tier key
-- (e.g. 'pro_monthly') to a provider-specific plan id. when summing stripe
-- we add rows here pointing at the stripe price_id; the application code
-- always queries by plan_key so it stays provider-agnostic.

create table if not exists payments.subscription_plans (
    id uuid primary key default gen_random_uuid(),
    plan_key text not null unique,
    display_name text not null,
    internal_tier text not null,
    provider payments.provider_name not null,
    provider_plan_id text not null,
    amount numeric(12, 2) not null,
    currency text not null,
    frequency int not null,
    frequency_type text not null,
    trial_days int not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (provider, provider_plan_id)
);

create index if not exists idx_subscription_plans_plan_key
    on payments.subscription_plans (plan_key)
    where is_active;

comment on table payments.subscription_plans is
    'provider-agnostic catalog of plans. one row per (provider, provider_plan_id).';

alter table payments.subscription_plans enable row level security;

create policy "authenticated users can read active plans"
    on payments.subscription_plans
    for select
    to authenticated
    using (is_active);

-- updated_at trigger for subscription_plans
create or replace function payments.set_subscription_plans_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_subscription_plans_updated_at
    on payments.subscription_plans;

create trigger trg_subscription_plans_updated_at
    before update on payments.subscription_plans
    for each row
    execute function payments.set_subscription_plans_updated_at();

-- =============================================================================
-- 4. subscriptions: current state of a provider-managed subscription
-- =============================================================================

create table if not exists payments.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade,
    provider payments.provider_name not null,
    provider_subscription_id text not null,
    status text not null,
    reason text,
    -- mercado pago specific denormalized fields. future providers may use
    -- payments.subscription_plans + provider_specific jsonb instead. these
    -- columns are kept here for easy querying/aggregation without joins.
    mp_payer_email text,
    frequency int,
    frequency_type text,
    transaction_amount numeric(12, 2),
    currency_id text,
    external_reference text,
    back_url text,
    auto_recurring jsonb,
    -- provider-specific payload that does not deserve a column.
    provider_specific jsonb,
    -- full raw provider response on last fetch. keep for audit/forensics.
    raw jsonb,
    first_seen_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (provider, provider_subscription_id)
);

create index if not exists idx_subscriptions_user_id
    on payments.subscriptions (user_id);

create index if not exists idx_subscriptions_provider_status
    on payments.subscriptions (provider, status);

comment on table payments.subscriptions is
    'provider-agnostic subscription state. one row per (provider, provider_subscription_id).';

alter table payments.subscriptions enable row level security;

create policy "users can read own subscriptions"
    on payments.subscriptions
    for select
    to authenticated
    using (user_id = auth.uid());

-- =============================================================================
-- 5. subscription_events: append-only audit log of webhook deliveries
-- =============================================================================

create table if not exists payments.subscription_events (
    id bigserial primary key,
    provider payments.provider_name not null,
    provider_subscription_id text,
    provider_event_id text,
    topic text not null,
    action text,
    payment_id bigint,
    x_request_id text,
    x_signature_ts bigint,
    x_signature_hash text,
    signature_valid boolean,
    body jsonb not null,
    received_at timestamptz default now(),
    processing_status text not null default 'received',
    processing_error text
);

create index if not exists idx_subscription_events_provider_subscription
    on payments.subscription_events (provider, provider_subscription_id);

create index if not exists idx_subscription_events_topic_action
    on payments.subscription_events (topic, action);

create index if not exists idx_subscription_events_received_at
    on payments.subscription_events (received_at desc);

comment on table payments.subscription_events is
    'append-only audit log of webhook deliveries from billing providers. service_role only.';

alter table payments.subscription_events enable row level security;

-- no policy for authenticated = denied by default. only service_role reads/writes.

-- =============================================================================
-- 6. updated_at trigger for subscriptions
-- =============================================================================

create or replace function payments.set_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_subscriptions_updated_at
    on payments.subscriptions;

create trigger trg_subscriptions_updated_at
    before update on payments.subscriptions
    for each row
    execute function payments.set_subscriptions_updated_at();

-- =============================================================================
-- 7. realtime broadcast on payments.subscriptions
-- =============================================================================
-- pattern copied verbatim from
-- 20260331214025_transactions_broadcast_trigger.sql and adapted to the
-- payments schema. the channel topic is scoped to the owning user:
-- `payments:subscriptions:<user_id>`, so only the owner receives events.

create or replace function payments.subscriptions_broadcast_changes()
returns trigger
security definer
language plpgsql
set search_path = ''
as $$
begin
    perform realtime.broadcast_changes(
        'payments:subscriptions:' || coalesce(new.user_id, old.user_id)::text,
        tg_op,
        tg_op,
        tg_table_name,
        tg_table_schema,
        new,
        old
    );
    return coalesce(new, old);
end;
$$;

drop trigger if exists trg_subscriptions_broadcast
    on payments.subscriptions;

create trigger trg_subscriptions_broadcast
    after insert or update or delete
    on payments.subscriptions
    for each row
    execute function payments.subscriptions_broadcast_changes();

-- rls on realtime.messages so authenticated users can only receive
-- broadcasts on their own channel.
drop policy if exists "authenticated users can receive own payments subscriptions broadcasts"
    on realtime.messages;

create policy "authenticated users can receive own payments subscriptions broadcasts"
    on realtime.messages
    for select
    to authenticated
    using (
        realtime.topic() = 'payments:subscriptions:' || auth.uid()::text
    );

-- =============================================================================
-- 8. grants
-- =============================================================================

grant select on payments.subscriptions to authenticated;
grant select on payments.subscription_plans to authenticated;
-- payments.subscription_events: no grant for authenticated (denied by rls).
-- writes are service_role only via the edge function.
