import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';
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
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="primary"
        size="md"
        icon={<Plus size={24} />}
        className="w-14 h-14 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
        aria-label={t('transactions.addTransaction')}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 right-0 bg-white rounded-xl shadow-lg p-2 w-64"
          >
            <Button
              onClick={() => {
                setIsOpen(false);
                onManualAdd();
              }}
              variant="ghost"
              size="md"
              fullWidth
              className="text-left justify-start"
            >
              {t('transactions.addManually')}
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                onUpload();
              }}
              variant="ghost"
              size="md"
              fullWidth
              className="text-left justify-start"
            >
              {t('transactions.uploadDocument')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
