import { useState, useEffect, useCallback } from "react";
import { Receipt, AlertCircle } from "lucide-react";
import { getSupabase } from "../lib/supabase";
import {
  createTransactionsService,
  type Transaction,
  type TransactionFilters,
} from "../services/transactions.service";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { TransactionList } from "../components/transactions/TransactionList";
import { TransactionDetail } from "../components/transactions/TransactionDetail";
import { TransactionFiltersComponent } from "../components/transactions/TransactionFilters";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { gmailService } from "../services/gmail.service";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function Transactions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [hasConnections, setHasConnections] = useState<boolean | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [availableEmails, setAvailableEmails] = useState<string[]>([]);

  // Load filter options once
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const supabase = await getSupabase();
        const service = createTransactionsService(supabase);
        const [currencies, emails] = await Promise.all([
          service.getAvailableCurrencies(),
          service.getAvailableEmails(),
        ]);
        setAvailableCurrencies(currencies);
        setAvailableEmails(emails);
      } catch (err) {
        console.error("Error loading filter options:", err);
      } finally {
        setLoadingFilters(false);
      }
    };
    loadFilterOptions();
  }, []);

  // Load transactions based on filters
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      const data = await service.getTransactions(filters);
      setTransactions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load and when filters change
  useEffect(() => {
    if (!loadingFilters) {
      loadTransactions();
    }
  }, [loadTransactions, loadingFilters]);

  // Categories are static
  const categories = [
    "salary",
    "entertainment",
    "investment",
    "food",
    "transport",
    "services",
    "health",
    "education",
    "housing",
    "clothing",
    "other",
  ];

  // Check if user has any Gmail connections
  useEffect(() => {
    const checkConnections = async () => {
      if (user?.id) {
        const status = await gmailService.getConnectionStatus(user.id);
        setHasConnections(status.total > 0);
      }
    };
    checkConnections();
  }, [user?.id]);

  const handleDeleteTransaction = async (id: string) => {
    try {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      await service.deleteTransaction(id);
      
      // Refresh transactions list
      await loadTransactions();
      
      // Clear selection if the deleted transaction was selected
      if (selectedTransaction?.id === id) {
        setSelectedTransaction(null);
      }
      
      toast.success(t("transactions.deleteSuccess"));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error(t("transactions.deleteError"));
      throw error;
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const supabase = await getSupabase();
      const service = createTransactionsService(supabase);
      await service.updateTransaction(id, updates);
      
      // Refresh transactions list
      await loadTransactions();
      
      // Update selected transaction
      if (selectedTransaction?.id === id) {
        setSelectedTransaction({ ...selectedTransaction, ...updates });
      }
      
      toast.success(t("transactions.updateSuccess"));
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error(t("transactions.updateError"));
      throw error;
    }
  };

  if (loadingFilters) {
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
            onClick={loadTransactions}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)]"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-4">
      {/* Warning banner when no Gmail accounts connected */}
      {hasConnections === false && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="text-yellow-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                {t("transactions.noAccountsConnected")}
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {t("transactions.noAccountsDescription")}
              </p>
              <Link
                to="/settings"
                className="inline-block mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
              >
                {t("transactions.connectAccount")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <TransactionFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        availableCurrencies={availableCurrencies}
        availableEmails={availableEmails}
        categories={categories}
        isLoading={loading}
      />

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Transaction List */}
        <div className="w-1/3 bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--text-secondary)]/20">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Receipt size={20} />
              {t("navigation.transactions")} ({transactions?.length || 0})
              {loading && <LoadingSpinner size="sm" className="ml-2" />}
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
            <TransactionDetail 
              transaction={selectedTransaction} 
              onDelete={handleDeleteTransaction}
              onUpdate={handleUpdateTransaction}
            />
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
    </div>
  );
}
