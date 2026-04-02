import { Suspense, useState, useCallback } from "react";
import { Receipt, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  type Transaction,
  type TransactionFilters,
} from "../services/transactions.service";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { TransactionList } from "../components/transactions/TransactionList";
import { TransactionDetail } from "../components/transactions/TransactionDetail";
import { TransactionFiltersComponent } from "../components/transactions/TransactionFilters";
import { AddTransactionButton } from "../components/transactions/AddTransactionButton";
import { TransactionFormModal } from "../components/transactions/TransactionFormModal";
import { UploadTransactionModal } from "../components/transactions/UploadTransactionModal";
import type { TransactionFormData } from "../components/transactions/TransactionFormModal";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import {
  useTransactions,
  flattenTransactionsData,
  getTotalCount,
  hasMorePages,
} from "../hooks/useTransactions";
import { useTransactionMutations } from "../hooks/useTransactionMutations";
import { useGmailStatus } from "../hooks/useGmailStatus";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import { mapTransactionFormDataToInsert } from "../utils/transactionForm";
import { SuspenseFallback } from "../components/ui/SuspenseFallback";

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

// ─── Data section — suspends on transactions + gmail status ──────────────────
interface TransactionsListProps {
  userId: string | undefined;
  filters: TransactionFilters;
  onFiltersChange: (f: TransactionFilters) => void;
  selectedTransaction: Transaction | null;
  onSelectTransaction: (t: Transaction | null) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
  isMobile: boolean;
}

function TransactionsList({
  userId,
  filters,
  selectedTransaction,
  onSelectTransaction,
  isMobile,
}: TransactionsListProps) {
  const { t } = useTranslation();

  const { data: gmailStatus } = useGmailStatus(userId);
  const {
    data: transactionsData,
    fetchNextPage,
    isFetchingNextPage: loadingMore,
    refetch,
  } = useTransactions({ filters });

  const transactions = flattenTransactionsData(transactionsData);
  const totalCount = getTotalCount(transactionsData);
  const hasMore = hasMorePages(transactionsData);
  const hasConnections = gmailStatus ? gmailStatus.activeTotal > 0 : null;

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) fetchNextPage();
  }, [fetchNextPage, loadingMore, hasMore]);

  return (
    <>
      {/* Warning banner */}
      {hasConnections === false && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shrink-0">
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

      {/* Transaction List */}
      <div
        className={`w-full lg:w-1/3 bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex flex-col ${isMobile && selectedTransaction ? "hidden" : "block"}`}
      >
        <div className="p-4 border-b border-[var(--text-secondary)]/20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
              <Receipt size={16} />
              {totalCount} {t("navigation.transactions").toLowerCase()}
              {loadingMore && <LoadingSpinner size="sm" className="ml-2" />}
            </h2>
            <Button
              onClick={() => refetch()}
              disabled={loadingMore}
              variant="ghost"
              size="sm"
              icon={
                <RefreshCw
                  size={18}
                  className={loadingMore ? "animate-spin" : ""}
                />
              }
              title={t("common.refresh") || "Actualizar"}
            />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <TransactionList
            transactions={transactions || []}
            selectedTransactionId={selectedTransaction?.id || null}
            onSelectTransaction={onSelectTransaction}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={loadingMore}
          />
        </div>
      </div>
    </>
  );
}

// ─── Page shell — renders immediately ────────────────────────────────────────
export function Transactions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>(() => {
    const category = searchParams.get("category");
    return { category: category || undefined };
  });
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [preFilledData, setPreFilledData] = useState<
    TransactionFormData | undefined
  >();

  const { deleteTransaction, updateTransaction, createTransaction } =
    useTransactionMutations();

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      if (selectedTransaction?.id === id) setSelectedTransaction(null);
      toast.success(t("transactions.deleteSuccess"));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error(t("transactions.deleteError"));
      throw error;
    }
  };

  const handleUpdateTransaction = async (
    id: string,
    updates: Partial<Transaction>
  ) => {
    try {
      await updateTransaction(id, updates);
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

  const handleUploadSuccess = useCallback(() => {
    toast.success(t("upload.success", "Document processed successfully!"));
  }, [t]);

  const handleUploadError = useCallback(
    (error: string) => {
      toast.error(t("upload.error", "Upload failed: {{error}}", { error }));
    },
    [t]
  );

  const handleCreateTransaction = async (formData: TransactionFormData) => {
    await createTransaction(mapTransactionFormDataToInsert(formData));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] gap-4">
      {/* Filter card: title+description render immediately;
          Currency+Email dropdowns inside have their own Suspense */}
      <div data-tour="transaction-filters">
        <TransactionFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
        />
      </div>

      {/* Transaction list + warning banner — suspends while loading */}
      <div
        data-tour="transaction-content"
        className="flex flex-1 gap-4 min-h-0 relative"
      >
        <Suspense fallback={<SuspenseFallback rows={6} className="w-1/3" />}>
          <TransactionsList
            userId={user?.id}
            filters={filters}
            onFiltersChange={setFilters}
            selectedTransaction={selectedTransaction}
            onSelectTransaction={setSelectedTransaction}
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
            isMobile={isMobile}
          />
        </Suspense>

        {/* Detail panel — always visible */}
        {!isMobile && (
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
        )}

        {/* Mobile overlay */}
        <AnimatePresence>
          {isMobile && selectedTransaction && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-50 bg-[var(--bg-secondary)] lg:hidden"
            >
              <TransactionDetail
                transaction={selectedTransaction}
                onDelete={handleDeleteTransaction}
                onUpdate={handleUpdateTransaction}
                onClose={() => setSelectedTransaction(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AddTransactionButton
          onManualAdd={() => setIsFormModalOpen(true)}
          onUpload={() => setIsUploadModalOpen(true)}
        />

        <TransactionFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setPreFilledData(undefined);
          }}
          onSave={handleCreateTransaction}
          mode="create"
          initialData={preFilledData}
        />

        <UploadTransactionModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
          onError={handleUploadError}
        />
      </div>
    </div>
  );
}
