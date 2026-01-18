import { Receipt } from "lucide-react";
import type { Transaction } from "../../services/transactions.service";
import { TransactionCard } from "./TransactionCard";
import { EmptyState } from "../ui/EmptyState";

interface TransactionListProps {
  transactions: Transaction[];
  selectedTransactionId: string | null;
  onSelectTransaction: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  selectedTransactionId,
  onSelectTransaction,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No hay transacciones"
        description="Las transacciones extraídas de tus emails aparecerán aquí"
      />
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          isSelected={selectedTransactionId === transaction.id}
          onClick={() => onSelectTransaction(transaction)}
        />
      ))}
    </div>
  );
}
