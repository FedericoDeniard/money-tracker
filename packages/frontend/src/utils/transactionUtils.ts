/**
 * Transaction utility functions
 */

export type TransactionType = 'income' | 'expense' | 'ingreso' | 'egreso';

export interface TransactionTypeResult {
  isExpense: boolean;
  isIncome: boolean;
  displayType: string;
  sign: string;
  colorClass: string;
}

/**
 * Determines transaction type properties
 */
export function getTransactionType(transactionType: TransactionType): TransactionTypeResult {
  const isExpense = transactionType === 'egreso' || transactionType === 'expense';
  const isIncome = transactionType === 'ingreso' || transactionType === 'income';
  
  return {
    isExpense,
    isIncome,
    displayType: isExpense ? 'Gasto' : isIncome ? 'Ingreso' : transactionType,
    sign: isExpense ? '-' : '+',
    colorClass: isExpense ? 'text-red-600' : isIncome ? 'text-green-600' : 'text-gray-900'
  };
}

/**
 * Formats date to Spanish locale
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats date to short format (day month)
 */
export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Capitalizes first letter of category
 */
export function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
