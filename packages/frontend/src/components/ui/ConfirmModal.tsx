import { Button } from "./Button";
import { Modal } from "./Modal";
import { useTranslation } from "react-i18next";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText,
  cancelText,
  isDestructive = false,
  isLoading = false,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      closeDisabled={isLoading}
      footer={
        <>
          <Button
            onClick={onClose}
            variant="secondary"
            size="md"
            disabled={isLoading}
          >
            {cancelText || t("common.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            variant={isDestructive ? "danger" : "primary"}
            size="md"
            disabled={isLoading}
            loading={isLoading}
          >
            {confirmText ||
              (isDestructive ? t("common.delete") : t("common.confirm"))}
          </Button>
        </>
      }
    >
      {children ?? (
        <p className="text-[var(--text-secondary)] py-2">{message}</p>
      )}
    </Modal>
  );
}
