import { X } from "lucide-react";
import { Button } from "./Button";
import { motion, AnimatePresence } from "framer-motion";
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {title}
                </h2>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  icon={<X size={20} />}
                  disabled={isLoading}
                />
              </div>

              {/* Message or Content */}
              {children ? children : (
                <p className="text-[var(--text-secondary)] mb-6">{message}</p>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-6">
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
                  {confirmText || (isDestructive ? t("common.delete") : t("common.confirm"))}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
