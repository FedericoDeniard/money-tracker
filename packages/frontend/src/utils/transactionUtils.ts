/**
 * Transaction utility functions
 */

type TransactionType = "income" | "expense" | "ingreso" | "egreso";

interface TransactionTypeResult {
  isExpense: boolean;
  isIncome: boolean;
  displayType: string;
  sign: string;
  colorClass: string;
}

export function getTransactionType(
  transactionType: TransactionType
): TransactionTypeResult {
  const isExpense =
    transactionType === "egreso" || transactionType === "expense";
  const isIncome =
    transactionType === "ingreso" || transactionType === "income";

  return {
    isExpense,
    isIncome,
    displayType: isExpense ? "Gasto" : isIncome ? "Ingreso" : transactionType,
    sign: isExpense ? "-" : "+",
    colorClass: isExpense
      ? "text-red-600"
      : isIncome
        ? "text-green-600"
        : "text-zinc-900",
  };
}
