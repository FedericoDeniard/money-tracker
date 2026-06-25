import type { TransactionFormData } from "../components/transactions/TransactionFormModal";

interface TransactionCreateInput {
  transaction_type: "income" | "expense";
  name: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  transaction_date: string;
  transaction_description: string;
  date: string;
  source_email: string;
  source_message_id: string;
}

export function mapTransactionFormDataToInsert(
  formData: TransactionFormData
): TransactionCreateInput {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    transaction_type: formData.transaction_type,
    name: formData.name,
    merchant: formData.merchant,
    amount: parseFloat(formData.amount),
    currency: formData.currency,
    category: formData.category,
    transaction_date: formData.transaction_date,
    transaction_description: formData.transaction_description,
    date: new Date().toISOString(),
    source_email: "",
    source_message_id: `manual-${uniqueSuffix}`,
  };
}
