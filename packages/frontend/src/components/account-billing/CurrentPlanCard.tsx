import { CreditCard, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMySubscription } from "../../hooks/useMySubscription";
import type { MySubscription } from "../../services/payments.service";

interface CurrentPlanCardProps {
  userId: string | undefined;
  onCancel: (subscription: MySubscription) => void;
  isCancelling: boolean;
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null || !currency) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatFrequency(frequency: number | null, type: string | null) {
  if (!frequency || !type) return null;
  const unit = frequency === 1 ? type.replace(/s$/, "") : type;
  return `cada ${frequency} ${unit}`;
}

function statusLabelKey(status: string): string {
  switch (status) {
    case "authorized":
      return "active";
    case "pending":
      return "pending";
    case "paused":
      return "paused";
    case "cancelled":
      return "cancelled";
    case "pending_cancellation":
      return "pendingCancellation";
    default:
      return "unknown";
  }
}

function statusBadgeClasses(status: string) {
  if (status === "authorized" || status === "paused") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "pending" || status === "pending_cancellation") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "cancelled") {
    return "bg-zinc-100 text-zinc-500";
  }
  return "bg-zinc-100 text-zinc-500";
}

export function CurrentPlanCard({
  userId,
  onCancel,
  isCancelling,
}: CurrentPlanCardProps) {
  const { t } = useTranslation();
  const { data: subscription, isLoading } = useMySubscription(userId);

  if (isLoading) {
    return (
      <div className="border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] rounded-2xl p-4 sm:p-6 shadow-sm">
        <p className="text-sm text-[var(--text-secondary)]">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--primary)]/10 rounded-lg shrink-0">
            <CreditCard className="text-[var(--primary)]" size={24} />
          </div>
          <div>
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              {t("accountBilling.currentPlan.title")}
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("accountBilling.currentPlan.empty")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const amount = formatCurrency(
    subscription.transaction_amount,
    subscription.currency_id
  );
  const frequency = formatFrequency(
    subscription.frequency,
    subscription.frequency_type
  );
  const statusKey = statusLabelKey(subscription.status);

  return (
    <div className="border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[var(--primary)]/10 rounded-lg shrink-0">
          <CreditCard className="text-[var(--primary)]" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-[var(--text-primary)]">
              {t("accountBilling.currentPlan.title")}
            </h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeClasses(subscription.status)}`}
            >
              {t(`accountBilling.status.${statusKey}`, subscription.status)}
            </span>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {amount}
              {frequency && (
                <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                  {frequency}
                </span>
              )}
            </p>
            {subscription.plan?.display_name && (
              <p className="text-sm text-[var(--text-secondary)]">
                {t("accountBilling.currentPlan.plan", {
                  name: subscription.plan.display_name,
                })}
              </p>
            )}
            {subscription.payer_email && (
              <p className="text-xs text-[var(--text-secondary)]">
                {t("accountBilling.currentPlan.payerEmail", {
                  email: subscription.payer_email,
                })}
              </p>
            )}
          </div>
          {subscription.status === "authorized" && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
              <CheckCircle2
                size={16}
                className="text-emerald-600 mt-0.5 shrink-0"
              />
              <p className="text-xs text-emerald-800">
                {t("accountBilling.currentPlan.activeHint")}
              </p>
            </div>
          )}
          {(subscription.status === "authorized" ||
            subscription.status === "paused") && (
            <button
              type="button"
              onClick={() => onCancel(subscription)}
              disabled={isCancelling}
              className="mt-4 text-sm text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
            >
              {isCancelling
                ? t("accountBilling.cancel.cancelling")
                : t("accountBilling.cancel.trigger")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
