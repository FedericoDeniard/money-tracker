-- Seed type: payments demo plans
-- Creates a baseline plan + MercadoPago variant for the local dev
-- environment. Admin-only seed: writes to payments.* are only allowed
-- via service_role (see 20260629023955_grant_dml_to_service_role_on_payments.sql).

-- 1) Plan concept: "Lite" (matches the `reason` exposed by the MP plan)
insert into payments.plans (
    plan_key,
    display_name,
    internal_tier,
    frequency,
    frequency_type,
    trial_days,
    is_active
  )
  values (
    'lite_monthly',
    'Lite',
    'lite',
    1,
    'months',
    0,
    true
  )
  on conflict (plan_key) do nothing;

-- 2) MercadoPago variant for that plan.
--    provider_plan_id is the preapproval_plan_id exposed by MP
--    (https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=...)
insert into payments.plan_provider_variants (
    plan_id,
    provider,
    provider_plan_id,
    amount,
    currency,
    is_active
  )
  select
    p.id,
    'mercadopago',
    'd89dfb7bdad34e6ca30e2927c6831fdd',
    10000,
    'ARS',
    true
  from payments.plans p
  where p.plan_key = 'lite_monthly'
  on conflict (plan_id, provider) do nothing;
