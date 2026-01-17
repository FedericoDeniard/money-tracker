import { useTranslation } from 'react-i18next';

/**
 * Hook to translate transaction categories
 */
export function useTranslateCategory() {
  const { t } = useTranslation();

  const translateCategory = (category: string): string => {
    return t(`categories.${category}`);
  };

  const translateTransactionType = (type: string): string => {
    if (type === 'egreso' || type === 'expense') {
      return t('transactions.expense');
    }
    if (type === 'ingreso' || type === 'income') {
      return t('transactions.income');
    }
    return type;
  };

  return { translateCategory, translateTransactionType };
}
