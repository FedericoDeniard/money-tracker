-- migration: add_report_pdf_export_grants
--
-- purpose:
--   second half of `add_report_pdf_export`. the previous migration
--   (20260706012443) added the enum value in its own transaction;
--   this one consumes it via three inserts:
--
--     1. payments.plan_capabilities — grant to lite_monthly so the
--        pricing page and admin tooling show it consistently with
--        the other paid capabilities
--     2. payments.default_capabilities — free-tier users get the
--        feature (marketing/feature-acquisition choice; the gate
--        is the usage counter, not the capability)
--     3. payments.usage_limits — caps:
--          role:tester      -> 500/month (QA team iterating quickly)
--          default          -> 10/month  (everyone else, tight cap
--                                         so growing users hit the
--                                         friction and become a
--                                         natural upsell trigger)
--        admin: unlimited via role bypass in
--        check_and_increment_usage (which this migration does not
--        need to set up — already done in
--        20260705163606_add_usage_limits_and_counters.sql).
--
--   no plan-specific override for lite_monthly: paid users get the
--   default 10/month cap. a single INSERT in this file is enough to
--   lift it later (e.g. `insert into usage_limits (capability, scope,
--   period, max_count) values ('report_pdf_export', 'plan:lite_monthly',
--   'month', 200);`). keeping it absent for the MVP makes the free
--   cap the universal cap until product graduates it.

-- 1. plan grant — explicit row on lite_monthly mirrors the pattern of
--    gmail_sync / ai_assistant / push_notifications / etc.
insert into payments.plan_capabilities (plan_id, capability)
select p.id, 'report_pdf_export'::payments.capability
  from payments.plans p
 where p.plan_key = 'lite_monthly'
   and not exists (
     select 1 from payments.plan_capabilities pc
      where pc.plan_id = p.id
        and pc.capability = 'report_pdf_export'
   );

-- 2. default capability — free users also get it. insertion is
--    idempotent via the unique primary key on (capability).
insert into payments.default_capabilities (capability)
values ('report_pdf_export')
on conflict do nothing;

-- 3. usage caps — tester is loose, default is tight. primary key
--    is (capability, scope, period); the on conflict guard avoids
--    spurious errors when re-running the seed locally.
insert into payments.usage_limits (capability, scope, period, max_count) values
  ('report_pdf_export', 'role:tester', 'month', 500),
  ('report_pdf_export', 'default',     'month',  10)
on conflict (capability, scope, period) do nothing;
