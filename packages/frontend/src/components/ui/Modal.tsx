import { X } from "lucide-react";
import { Button } from "./Button";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  footer: React.ReactNode;
  children: React.ReactNode;
  closeDisabled?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  footer,
  children,
  closeDisabled = false,
}: ModalProps) {
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
              className="bg-white rounded-3xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {title}
                </h2>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  icon={<X size={20} />}
                  disabled={closeDisabled}
                />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 pb-4">{children}</div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 shrink-0 border-t border-gray-100">
                {footer}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
