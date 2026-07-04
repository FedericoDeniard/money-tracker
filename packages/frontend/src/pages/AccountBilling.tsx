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
import { PricingGrid } from "../components/account-billing/PricingGrid";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { toast } from "../utils/toast";
import type { MySubscription } from "../services/payments.service";
import { FREE_PLAN } from "../services/pricing";

// status values where a cancel button makes sense. cancelled and
// pending_cancellation are excluded because the user already kicked
// off cancellation (or the cancellation completed) — there's nothing
// left to cancel.
const ACTIVE_STATUSES = new Set(["authorized", "pending", "paused"]);

export function AccountBilling() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: subscription, isLoading: isLoadingSub } =
    useMySubscription(userId);
  const { data: plans, isLoading: isLoadingPlans } = useAvailablePlans();

  const createCheckoutLink = useCreateCheckoutLink();
  const cancelSubscription = useCancelSubscription();
  const invalidatePayments = useInvalidatePaymentsQueries();

  const [cancelTarget, setCancelTarget] = useState<MySubscription | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

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

  // tier click. the pricing card key is the plan id (for db plans) or
  // "free" (for the free card). only db plans route through
  // create-subscription — free has no checkout.
  const handleSelect = async (key: string) => {
    if (key === "free") return;
    const plan = plans?.find(p => p.id === key);
    const variant = plan?.plan_provider_variants.find(v => v.is_active);
    if (!plan || !variant) {
      toast.error(t("accountBilling.toast.noActiveVariant"));
      return;
    }

    setPendingKey(key);
    try {
      const result = await createCheckoutLink.mutateAsync({
        planId: plan.id,
        provider: variant.provider,
      });
      toast.info(t("accountBilling.toast.checkoutOpened"));
      window.location.href = result.initPoint;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.error");
      console.error("[billing] checkout link failed", { error, message });
      toast.error(t("accountBilling.toast.subscribeError"), message);
      setPendingKey(null);
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

  const isLoading = isLoadingSub || isLoadingPlans;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 flex flex-col gap-6">
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
          {t("accountBilling.title")}
        </h1>
        <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
          {t("accountBilling.description")}
        </p>
      </section>

      <PricingGrid
        freePlan={FREE_PLAN}
        dbPlans={plans ?? []}
        subscription={subscription ?? null}
        pendingKey={pendingKey}
        onSelect={handleSelect}
      />

      {subscription &&
        subscription.plan_id &&
        ACTIVE_STATUSES.has(subscription.status) && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setCancelTarget(subscription)}
              disabled={cancelSubscription.isPending}
              className="text-sm text-[var(--text-secondary)] hover:text-red-600 hover:underline disabled:opacity-50"
            >
              {cancelSubscription.isPending
                ? t("accountBilling.cancel.cancelling")
                : t("accountBilling.cancel.trigger")}
            </button>
          </div>
        )}

      <ConfirmModal
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        title={t("accountBilling.cancel.title")}
        message={t("accountBilling.cancel.description")}
        confirmText={t("accountBilling.cancel.confirm")}
        cancelText={t("common.cancel")}
        isDestructive
        isLoading={cancelSubscription.isPending}
      />

      {isLoading ? null : null}
    </div>
  );
}
