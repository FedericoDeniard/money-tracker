import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useAvailablePlans } from "../hooks/useAvailablePlans";
import { useMySubscription } from "../hooks/useMySubscription";
import {
  useCreateCheckoutLink,
  useInvalidatePaymentsQueries,
} from "../hooks/useCreateCheckoutLink";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { CurrentPlanCard } from "../components/account-billing/CurrentPlanCard";
import { AvailablePlansList } from "../components/account-billing/AvailablePlansList";
import { CancelSubscriptionModal } from "../components/account-billing/CancelSubscriptionModal";
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
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: plans, isLoading: isLoadingPlans } = useAvailablePlans();
  const { data: subscription, isLoading: isLoadingSub } =
    useMySubscription(userId);

  const createCheckoutLink = useCreateCheckoutLink();
  const cancelSubscription = useCancelSubscription();
  const invalidatePayments = useInvalidatePaymentsQueries();

  const [cancelTarget, setCancelTarget] = useState<MySubscription | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  // when mp redirects the user back here with ?subscribed=1 we toast a
  // confirmation and invalidate the subscription cache so the new plan
  // shows up. the webhook will be the source of truth for the row, but
  // the user gets an immediate acknowledgement.
  useEffect(() => {
    if (searchParams.get("subscribed") === "1") {
      invalidatePayments();
      toast.success(t("accountBilling.toast.subscribed"));
      const next = new URLSearchParams(searchParams);
      next.delete("subscribed");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, invalidatePayments, t]);

  const hasActiveSubscription = subscription
    ? ACTIVE_STATUSES.has(subscription.status)
    : false;

  const handleSubscribe = async (plan: PlanWithVariants) => {
    const variant = plan.plan_provider_variants.find(v => v.is_active);
    if (!variant) {
      toast.error(t("accountBilling.toast.noActiveVariant"));
      return;
    }

    setPendingPlanId(plan.id);
    try {
      // server-side creates the preapproval with external_reference =
      // user.id, returns the plan's init_point for the user to complete
      // payment on mp's site. the webhook carries external_reference
      // back and stamps user_id via resolveUserId.
      const result = await createCheckoutLink.mutateAsync({
        planId: plan.id,
        provider: variant.provider,
      });
      toast.info(t("accountBilling.toast.checkoutOpened"));
      window.location.href = result.initPoint;
    } catch (error) {
      // surface the raw mp response so we can see exactly what the api
      // said — different from a curl invocation sometimes.
      const message =
        error instanceof Error ? error.message : t("common.error");
      console.error("[billing] checkout link failed", { error, message });
      toast.error(t("accountBilling.toast.subscribeError"), message);
      setPendingPlanId(null);
    }
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
            pendingPlanId={pendingPlanId}
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
    </div>
  );
}
