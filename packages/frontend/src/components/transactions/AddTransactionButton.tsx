import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type AddTransactionButtonProps = {
  onManualAdd: () => void;
  onUpload: () => void;
};

export function AddTransactionButton({ onManualAdd, onUpload }: AddTransactionButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg hover:bg-white hover:text-[var(--primary)] hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-[var(--primary)]"
        aria-label={t('transactions.addTransaction')}
      >
        <Plus size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 bg-white rounded-xl shadow-lg p-2 w-64"
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onManualAdd();
              }}
              className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('transactions.addManually')}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onUpload();
              }}
              className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {t('transactions.uploadDocument')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
