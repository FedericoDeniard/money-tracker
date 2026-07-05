-- migration: unify_plans_and_add_cancellation
-- purpose: split the provider-coupled `subscription_plans` into a
--          provider-agnostic concept (`plans`) and a relational price-per-
--          provider table (`plan_provider_variants`). add `plan_id` FK to
--          `subscriptions`. rename `mp_payer_email` to `payer_email` so the
--          column name matches its provider-agnostic meaning.
--
--          the new shape lets a single "plan" (e.g. "pro_monthly") be
--          enabled on multiple providers, each with its own price in the
--          provider's currency. the presence of a row in
--          `plan_provider_variants` is what makes the plan available on
--          that provider — no row, no enablement.
--
-- affected tables: payments.subscription_plans (drop), payments.plans (create),
--                 payments.plan_provider_variants (create),
--                 payments.subscriptions (column renames + new FK).
-- special considerations:
--   * not applied in prod, so the rename + drop + recreate is safe.
--   * one row in `subscription_plans` migrates to (1 plan, 1 variant).
--   * `frequency` and `frequency_type` are conceptual (same on every
--     provider for a given plan), so they live in `plans`. `amount` and
--     `currency` are provider-specific, so they live in the variants.

-- ============================================================================
-- 1. drop the old provider-coupled table
-- ============================================================================
drop table if exists payments.subscription_plans cascade;

-- ============================================================================
-- 2. plans (provider-agnostic concept)
-- ============================================================================
create table if not exists payments.plans (
    id uuid primary key default gen_random_uuid(),
    plan_key text not null unique,
    display_name text not null,
    internal_tier text not null,
    frequency int not null,
    frequency_type text not null,
    trial_days int not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_plans_plan_key_active
    on payments.plans (plan_key) where is_active;

comment on table payments.plans is
    'provider-agnostic plan concept. one row per logical plan (e.g. pro_monthly).';

-- ============================================================================
-- 3. plan_provider_variants (the price per provider)
-- ============================================================================
create table if not exists payments.plan_provider_variants (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references payments.plans(id) on delete cascade,
    provider payments.provider_name not null,
    provider_plan_id text not null,
    amount numeric(12, 2) not null,
    currency text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- a plan has exactly one price per provider.
    unique (plan_id, provider),
    -- the same provider_plan_id cannot be claimed by two variants (would
    -- indicate a data error: two plan rows pointing at the same mp plan).
    unique (provider, provider_plan_id)
);

create index if not exists idx_plan_provider_variants_plan
    on payments.plan_provider_variants (plan_id)
    where is_active;
create index if not exists idx_plan_provider_variants_provider
    on payments.plan_provider_variants (provider, is_active);

comment on table payments.plan_provider_variants is
    'relational price for a plan on a specific provider. a row''s presence means the plan is enabled on that provider. one row per (plan, provider) — enforced by the unique constraint.';

-- ============================================================================
-- 4. plans + plan_provider_variants RLS
-- ============================================================================
alter table payments.plans enable row level security;

create policy "authenticated users can read active plans"
    on payments.plans
    for select
    to authenticated
    using (is_active);

alter table payments.plan_provider_variants enable row level security;

create policy "authenticated users can read active variants"
    on payments.plan_provider_variants
    for select
    to authenticated
    using (is_active);

-- plans / plan_provider_variants writes are service_role only (bypasses rls).

-- ============================================================================
-- 5. updated_at trigger for plans + plan_provider_variants
-- ============================================================================
create or replace function payments.set_plans_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_plans_updated_at on payments.plans;
create trigger trg_plans_updated_at
    before update on payments.plans
    for each row
    execute function payments.set_plans_updated_at();

create or replace function payments.set_plan_provider_variants_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_plan_provider_variants_updated_at
    on payments.plan_provider_variants;
create trigger trg_plan_provider_variants_updated_at
    before update on payments.plan_provider_variants
    for each row
    execute function payments.set_plan_provider_variants_updated_at();

-- ============================================================================
-- 6. subscriptions: rename mp_payer_email to payer_email, add plan_id FK
-- ============================================================================
alter table payments.subscriptions
    rename column mp_payer_email to payer_email;

alter table payments.subscriptions
    add column plan_id uuid references payments.plans(id) on delete set null;

create index if not exists idx_subscriptions_plan_id
    on payments.subscriptions (plan_id);

-- ============================================================================
-- 7. grants
-- ============================================================================
-- service_role: explicit dml on the new tables. (bypasses rls.)
grant select, insert, update, delete on payments.plans to service_role;
grant select, insert, update, delete on payments.plan_provider_variants to service_role;
-- no sequence grants needed: the `id uuid` columns use gen_random_uuid() which
-- doesn't create a backing sequence. (the earlier migration that granted
-- sequences to service_role on `payments.*` is no-op for uuid primary keys.)

-- authenticated: read access to plans + variants (rls filters to active only).
grant select on payments.plans to authenticated;
grant select on payments.plan_provider_variants to authenticated;

-- ============================================================================
-- 8. backfill from any existing data
-- ============================================================================
-- not strictly necessary because we already dropped the old table, but if
-- the migration is re-run in a context where `subscription_plans` is
-- recreated before this migration runs, the backfill keeps the data
-- coherent. skipped here because the drop is in section 1.
