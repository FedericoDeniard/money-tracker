import { useState } from "react";
import { Receipt } from "lucide-react";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import {
  createTransactionsService,
  type Transaction,
} from "../services/emails.service";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { TransactionList } from "../components/transactions/TransactionList";
import { TransactionDetail } from "../components/transactions/TransactionDetail";
import { useTranslation } from "react-i18next";

export function Transactions() {
  const { t } = useTranslation();
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const {
    data: transactions,
    loading,
    error,
    refetch,
  } = useSupabaseQuery(async (supabase) => {
    const service = createTransactionsService(supabase);
    return await service.getTransactions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[var(--error)] mb-2">{t("errors.loadingError")}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)]"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Transaction List */}
      <div className="w-1/3 bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--text-secondary)]/20">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt size={20} />
            {t("navigation.transactions")} ({transactions?.length || 0})
          </h2>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <TransactionList
            transactions={transactions || []}
            selectedTransactionId={selectedTransaction?.id || null}
            onSelectTransaction={setSelectedTransaction}
          />
        </div>
      </div>

      {/* Transaction Detail */}
      <div className="flex-1 bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
        {selectedTransaction ? (
          <TransactionDetail transaction={selectedTransaction} />
        ) : (
          <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <Receipt size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t("transactions.selectTransaction")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
