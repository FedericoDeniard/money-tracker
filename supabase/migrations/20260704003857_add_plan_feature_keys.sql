-- migration: add_plan_feature_keys
-- purpose: store an ordered list of i18n keys on payments.plans so the
--          pricing page can render the feature list per plan. each
--          element is a fully-qualified i18n key (e.g.
--          "accountBilling.pricing.dbPlanFeatures.lite.gmailSync") that
--          the frontend translates with t(). array preserves display
--          order. an empty array is valid (plan with no features shown).
--
-- affected tables: payments.plans
-- affected rows:    payments.plans WHERE plan_key = 'lite_monthly'
-- special considerations:
--   * jsonb (not text[]) so we can extend per-element metadata later
--     (e.g. icon, sort_order, description_key) without a schema change.
--   * the free plan has no row in payments.plans; it stays hardcoded
--     in the frontend with its own i18n keys (services/pricing.ts).
--   * rls on payments.plans is unchanged: authenticated can read
--     is_active = true rows; writes are service_role only.

alter table payments.plans
  add column feature_keys jsonb not null default '[]'::jsonb;

comment on column payments.plans.feature_keys is
  'ordered list of i18n keys rendered as the feature list on the pricing card. empty array hides the list.';

-- seed the existing lite plan with its feature set. every entry is an
-- i18n key whose value lives in packages/frontend/src/i18n/locales/{en,es}.json
-- under accountBilling.pricing.dbPlanFeatures.lite.<key>.
update payments.plans
set feature_keys = '[
  "accountBilling.pricing.dbPlanFeatures.lite.everythingInFree",
  "accountBilling.pricing.dbPlanFeatures.lite.gmailSync",
  "accountBilling.pricing.dbPlanFeatures.lite.aiAssistant",
  "accountBilling.pricing.dbPlanFeatures.lite.pushNotifications",
  "accountBilling.pricing.dbPlanFeatures.lite.advancedReports"
]'::jsonb
where plan_key = 'lite_monthly';
