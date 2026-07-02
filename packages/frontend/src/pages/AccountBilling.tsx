import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useAvailablePlans } from "../hooks/useAvailablePlans";
import { useMySubscription } from "../hooks/useMySubscription";
import { useInvalidatePaymentsQueries } from "../hooks/useCreateCheckoutLink";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { CurrentPlanCard } from "../components/account-billing/CurrentPlanCard";
import { AvailablePlansList } from "../components/account-billing/AvailablePlansList";
import { CancelSubscriptionModal } from "../components/account-billing/CancelSubscriptionModal";
import { MpCheckoutModal } from "../components/account-billing/MpCheckoutModal";
import { toast } from "../utils/toast";
import type {
  MySubscription,
  PlanWithVariants,
} from "../services/payments.service";

const ACTIVE_STATUSES = new Set([
  "authorized",
  "pending",
  "paused",
  "pending_cancellation",
]);

export function AccountBilling() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;

  const { data: plans, isLoading: isLoadingPlans } = useAvailablePlans();
  const { data: subscription, isLoading: isLoadingSub } =
    useMySubscription(userId);

  const cancelSubscription = useCancelSubscription();
  const invalidatePayments = useInvalidatePaymentsQueries();

  const [cancelTarget, setCancelTarget] = useState<MySubscription | null>(null);
  const [checkoutTarget, setCheckoutTarget] = useState<PlanWithVariants | null>(
    null
  );

  const hasActiveSubscription = subscription
    ? ACTIVE_STATUSES.has(subscription.status)
    : false;

  const handleSubscribe = (plan: PlanWithVariants) => {
    console.info("[billing] subscribe clicked", {
      planId: plan.id,
      userId,
    });
    setCheckoutTarget(plan);
  };

  const handleCheckoutSuccess = () => {
    invalidatePayments();
  };

  const handleConfirmCancel = async () => {
    try {
      await cancelSubscription.mutateAsync();
      toast.success(t("accountBilling.toast.cancelSuccess"));
      invalidatePayments();
      setCancelTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.error");
      toast.error(t("accountBilling.toast.cancelError"), message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 flex flex-col gap-4">
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
          {t("accountBilling.title")}
        </h1>
        <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
          {t("accountBilling.description")}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 sm:p-6 shadow-sm flex flex-col gap-6">
        <CurrentPlanCard
          userId={userId}
          onCancel={setCancelTarget}
          isCancelling={cancelSubscription.isPending}
        />

        <div>
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-3">
            {t("accountBilling.availablePlans.title")}
          </h2>
          <AvailablePlansList
            plans={plans ?? []}
            hasActiveSubscription={hasActiveSubscription}
            isLoading={isLoadingPlans || isLoadingSub}
            pendingPlanId={null}
            onSubscribe={handleSubscribe}
          />
        </div>
      </section>

      <CancelSubscriptionModal
        isOpen={cancelTarget !== null}
        isLoading={cancelSubscription.isPending}
        subscription={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
      />

      <MpCheckoutModal
        isOpen={checkoutTarget !== null}
        plan={checkoutTarget}
        onClose={() => setCheckoutTarget(null)}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
