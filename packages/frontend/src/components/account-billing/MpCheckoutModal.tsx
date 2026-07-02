import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { MpCardCheckout } from "./MpCardCheckout";
import { paymentsService } from "../../services/payments.service";
import { toast } from "../../utils/toast";
import type { PlanWithVariants } from "../../services/payments.service";

interface MpCheckoutModalProps {
  isOpen: boolean;
  plan: PlanWithVariants | null;
  onClose: () => void;
  onSuccess: () => void;
}

// modal hosting the CardPayment Brick. the brick renders the
// entire checkout form (cardholder name, identification, card
// number, expiration, security code) inside an mp-managed iframe.
// when the user submits the brick form, we get the card_token_id
// and forward it to the server which creates the preapproval in
// authorized status with external_reference = our user.id.
export function MpCheckoutModal({
  isOpen,
  plan,
  onClose,
  onSuccess,
}: MpCheckoutModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const variant = plan?.plan_provider_variants.find(v => v.is_active) ?? null;

  const handleTokenized = async (cardTokenId: string) => {
    if (!plan || !variant) return;
    setIsSubmitting(true);
    try {
      console.info("[billing] modal tokenized", { planId: plan.id });
      const result = await paymentsService.createCheckoutLink(
        plan.id,
        variant.provider,
        { cardTokenId }
      );
      console.info("[billing] checkout link created", {
        planId: plan.id,
        status: result.status,
      });
      toast.success(t("accountBilling.toast.checkoutStarted"));
      onSuccess();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("common.error");
      console.error("[billing] checkout link failed", error);
      toast.error(t("accountBilling.toast.subscribeError"), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={plan ? plan.display_name : ""}
      closeDisabled={isSubmitting}
      footer={
        <p className="text-xs text-[var(--text-secondary)]">
          {t("accountBilling.modal.cardHint")}
        </p>
      }
    >
      <div className="space-y-4">
        {plan && (
          <p className="text-sm text-[var(--text-secondary)]">
            {t("accountBilling.modal.description", {
              amount: variant
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: variant.currency,
                    minimumFractionDigits: 0,
                  }).format(Number(variant.amount))
                : "",
            })}
          </p>
        )}
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {t("accountBilling.modal.testCardHint")}
        </p>
        {variant && (
          <MpCardCheckout
            amount={Number(variant.amount)}
            currency={variant.currency}
            onTokenized={handleTokenized}
            onError={error => {
              console.error("[billing] brick error", error);
              toast.error(t("accountBilling.brick.error"));
            }}
          />
        )}
      </div>
    </Modal>
  );
}
