import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import type { PlanWithVariants } from "../../services/payments.service";

interface AvailablePlansListProps {
  plans: PlanWithVariants[];
  hasActiveSubscription: boolean;
  isLoading: boolean;
  pendingPlanId: string | null;
  onSubscribe: (plan: PlanWithVariants) => void;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatFrequency(frequency: number | null, type: string | null) {
  if (!frequency || !type) return "";
  const unit = frequency === 1 ? type.replace(/s$/, "") : type;
  return `${frequency === 1 ? "" : `${frequency} `}${unit}`;
}

export function AvailablePlansList({
  plans,
  hasActiveSubscription,
  isLoading,
  pendingPlanId,
  onSubscribe,
}: AvailablePlansListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        {t("common.loading")}
      </p>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="border border-dashed border-[var(--text-secondary)]/30 rounded-2xl p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("accountBilling.availablePlans.empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map(plan => {
        const activeVariant =
          plan.plan_provider_variants.find(v => v.is_active) ?? null;

        return (
          <div
            key={plan.id}
            className="border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col"
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {plan.display_name}
            </h3>
            {activeVariant && (
              <div className="mt-2">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {formatCurrency(activeVariant.amount, activeVariant.currency)}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatFrequency(plan.frequency, plan.frequency_type)}
                </p>
              </div>
            )}
            {plan.trial_days > 0 && (
              <p className="mt-2 text-xs text-[var(--primary)]">
                {t("accountBilling.availablePlans.trialDays", {
                  days: plan.trial_days,
                })}
              </p>
            )}
            <div className="flex-1" />
            <div className="mt-4">
              <Button
                variant="primary"
                fullWidth
                loading={pendingPlanId === plan.id}
                disabled={
                  !activeVariant ||
                  hasActiveSubscription ||
                  pendingPlanId !== null
                }
                onClick={() => onSubscribe(plan)}
              >
                {hasActiveSubscription
                  ? t("accountBilling.availablePlans.alreadySubscribed")
                  : t("accountBilling.availablePlans.subscribe")}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
