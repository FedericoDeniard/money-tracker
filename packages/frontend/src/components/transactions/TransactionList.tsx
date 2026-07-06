import { Receipt } from "lucide-react";
import type { Transaction } from "../../services/transactions.service";
import type { ReportSummary } from "../../types/reports";
import { TransactionCard } from "./TransactionCard";
import { EmptyState } from "../ui/EmptyState";
import { useInfiniteScroll } from "../../hooks/useInfiniteScroll";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface TransactionListProps {
  transactions: Transaction[];
  selectedTransactionId: string | null;
  onSelectTransaction: (transactionId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  reportsById?: Map<string, ReportSummary>;
}

export function TransactionList({
  transactions,
  selectedTransactionId,
  onSelectTransaction,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  reportsById,
}: TransactionListProps) {
  const sentinelRef = useInfiniteScroll({
    onLoadMore: onLoadMore || (() => {}),
    hasMore,
    isLoading: isLoadingMore,
    threshold: 200,
  });

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
      {transactions.map(transaction => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          isSelected={selectedTransactionId === transaction.id}
          onClick={() => onSelectTransaction(transaction.id)}
          report={
            transaction.report_id
              ? reportsById?.get(transaction.report_id)
              : undefined
          }
        />
      ))}

      {/* Sentinel element for intersection observer */}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {isLoadingMore && <LoadingSpinner size="sm" />}
        </div>
      )}
    </div>
  );
}
