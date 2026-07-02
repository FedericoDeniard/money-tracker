import { useTranslation } from "react-i18next";
import { ConfirmModal } from "../ui/ConfirmModal";
import type { MySubscription } from "../../services/payments.service";

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  isLoading: boolean;
  subscription: MySubscription | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelSubscriptionModal({
  isOpen,
  isLoading,
  subscription,
  onClose,
  onConfirm,
}: CancelSubscriptionModalProps) {
  const { t } = useTranslation();

  if (!subscription) return null;

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t("accountBilling.cancel.title")}
      confirmText={t("accountBilling.cancel.confirm")}
      cancelText={t("common.cancel")}
      isDestructive
      isLoading={isLoading}
    >
      <p className="text-sm text-[var(--text-secondary)] py-2">
        {t("accountBilling.cancel.description")}
      </p>
    </ConfirmModal>
  );
}
