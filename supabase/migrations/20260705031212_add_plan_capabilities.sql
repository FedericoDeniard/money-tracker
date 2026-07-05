-- migration: add_plan_capabilities
--
-- purpose:
--   decouple subscription plans from product capabilities so the codebase can
--   gate features by capability (e.g. "gmail_sync", "ai_assistant") instead
--   of by plan name. plans remain dynamic in payments.plans; capabilities
--   are mapped to plans via this join table. edge functions read from this
--   table to enforce gates (the security boundary) and the access-token
--   hook injects the same set into the JWT as a UI hint.
--
-- design notes:
--   * capability is a real postgres enum (payments.capability) rather than
--     text + check constraint. the enum is the vocabulary definition; it
--     lives next to the table that uses it and can be referenced from
--     other columns / future migrations.
--   * the set: gmail_sync, ai_assistant, push_notifications,
--     advanced_reports, process_documents. `process_documents` gates
--     the receipt/image upload path (process-document edge function)
--     — distinct from `ai_assistant` which gates the chat assistant
--     on /assistant. they were lumped together in the first cut
--     because both rely on the same underlying LLM, but they are
--     independently sellable and should be gated separately.
--   * plan_capabilities is not the same as payments.plans.feature_keys.
--     feature_keys is an ordered list of i18n keys rendered on the pricing
--     card. plan_capabilities is the access-control mapping. the names
--     intentionally overlap (gmail_sync vs accountBilling.pricing.dbPlanFeatures.lite.gmailSync)
--     so product and engineering stay aligned, but they are separate
--     concerns.
--   * the free plan has no row in payments.plans (hardcoded in the
--     frontend), so it gets no capabilities.
--
-- affected types:
--   new: payments.capability (enum)
-- affected tables:
--   new: payments.plan_capabilities
-- affected rows: none (no backfill in this migration; see
--   supabase/seeds/006_payments_demo.sql section 4 for the demo grants).
--
-- special considerations:
--   * rls enabled: authenticated can select all rows (the set is small,
--     non-sensitive, and consumed by the frontend via supabase-js and by
--     the auth hook via direct sql). writes remain service_role only.
--   * no realtime, no foreign-key relationship from plan_capabilities to
--     subscriptions — the auth hook joins through payments.subscriptions →
--     payments.plans → payments.plan_capabilities.
--   * why no backfill in the migration: supabase db reset runs
--     migrations before seeds, so an `insert ... where plan_key =
--     'lite_monthly'` here would be a no-op on a fresh install (the
--     plan doesn't exist yet). the seed is the right place because it
--     runs after the plan insert. see supabase/seeds/006_payments_demo.sql.

-- 1. capability enum type
--    postgres-level vocabulary for what the codebase can gate. kept in the
--    payments schema (alongside plan_capabilities) since that is the only
--    table that uses it today; if other tables start referencing it, this
--    comment is the place to revisit the schema placement.
create type payments.capability as enum (
  'gmail_sync',
  'ai_assistant',
  'push_notifications',
  'advanced_reports',
  'process_documents'
);

comment on type payments.capability is
  'capability vocabulary used by payments.plan_capabilities. mirrored by Capability union in packages/frontend/src/lib/capabilities.ts and supabase/functions/_shared/capabilities.ts. to add a new value to a deployed environment, run `alter type payments.capability add value ''<name>'';` (must run outside a transaction block — use `supabase db execute`, not `supabase migration up`). for fresh DBs, edit the `create type` above in this migration instead.';

-- 2. table
create table payments.plan_capabilities (
  plan_id    uuid not null references payments.plans(id) on delete cascade,
  capability payments.capability not null,
  created_at timestamptz not null default now(),
  primary key (plan_id, capability)
);

comment on table payments.plan_capabilities is
  'capability grants per plan. capabilities are a fixed vocabulary (see payments.capability enum) that the codebase uses to gate features; plans remain dynamic and can be created or renamed in payments.plans without breaking code-level checks.';
comment on column payments.plan_capabilities.capability is
  'capability identifier (one of payments.capability). mirrored by Capability union in packages/frontend/src/lib/capabilities.ts and supabase/functions/_shared/capabilities.ts.';

-- 3. index for the reverse lookup (capability → plans). used by the auth
--    hook to compute the union of capabilities across all of a user's
--    active subscriptions.
create index idx_plan_capabilities_capability
  on payments.plan_capabilities using btree (capability);

-- 4. rls
--    authenticated can read all rows: the capability vocabulary is not
--    sensitive, and the frontend may want to render capability-aware UI
--    (e.g. upgrade prompts). no write policies — only service_role can
--    insert/update/delete, which it bypasses rls.
alter table payments.plan_capabilities enable row level security;

create policy "plan_capabilities_select_authenticated"
  on payments.plan_capabilities
  as permissive
  for select
  to authenticated
  using (true);

-- 5. grants
grant select on payments.plan_capabilities to authenticated;

-- 6. (no backfill here.)
--    The minimum-viable capability grants for the demo lite_monthly
--    plan are seeded by supabase/seeds/006_payments_demo.sql
--    (section 4), not by this migration. Migrations run before seeds
--    in supabase's reset pipeline, so an `insert ... where
--    plan_key = 'lite_monthly'` here would be a no-op (the plan row
--    doesn't exist yet). The seed is the single source of truth for
--    demo capability grants; on a fresh `supabase db reset` the seed
--    inserts the plan and immediately grants its capabilities.