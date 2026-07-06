import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  Component,
  useState,
} from "react";
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
import { useLiveTransaction } from "../hooks/useLiveTransaction";
import { useReports } from "../hooks/useReports";
import { useTransactionMutations } from "../hooks/useTransactionMutations";
import { useGmailStatus } from "../hooks/useGmailStatus";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getSupabase } from "../lib/supabase";
import { createTransactionsService } from "../services/transactions.service";
import { toast } from "sonner";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { mapTransactionFormDataToInsert } from "../utils/transactionForm";
import { SuspenseFallback } from "../components/ui/SuspenseFallback";
import { useTagMutations } from "../hooks/useTagMutations";

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
  selectedTransactionId: string | null;
  onSelectTransaction: (transactionId: string) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Transaction>) => Promise<void>;
  isMobile: boolean;
}

function TransactionsList({
  userId,
  filters,
  selectedTransactionId,
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

  // One shared query for all reports — every TransactionCard renders a
  // deterministic-color badge for its report. TanStack dedupes the cache
  // so this is a single fetch for the page, not N. `data` is undefined
  // until the first fetch resolves, so we default to `[]` for the map.
  const { data: activeReports } = useReports("active");
  const reportsById = useMemo(
    () => new Map((activeReports ?? []).map(r => [r.id, r])),
    [activeReports]
  );

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
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg shrink-0">
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
        className={`w-full lg:w-1/3 bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex flex-col ${isMobile && selectedTransactionId ? "hidden" : "block"}`}
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
            selectedTransactionId={selectedTransactionId}
            onSelectTransaction={onSelectTransaction}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            isLoadingMore={loadingMore}
            reportsById={reportsById}
          />
        </div>
      </div>
    </>
  );
}

// ─── Page shell — renders immediately ────────────────────────────────────────
interface TransactionsState {
  selectedTransactionId: string | null;
  filters: TransactionFilters;
  isFormModalOpen: boolean;
  isUploadModalOpen: boolean;
  preFilledData: TransactionFormData | undefined;
}

type TransactionsAction =
  | { type: "SELECT_TRANSACTION"; transactionId: string | null }
  | { type: "SET_FILTERS"; filters: TransactionFilters }
  | { type: "SET_FORM_MODAL_OPEN"; isOpen: boolean }
  | { type: "SET_UPLOAD_MODAL_OPEN"; isOpen: boolean }
  | { type: "SET_PRE_FILLED_DATA"; data: TransactionFormData | undefined };

function transactionsReducer(
  state: TransactionsState,
  action: TransactionsAction
): TransactionsState {
  switch (action.type) {
    case "SELECT_TRANSACTION":
      return { ...state, selectedTransactionId: action.transactionId };
    case "SET_FILTERS":
      return { ...state, filters: action.filters };
    case "SET_FORM_MODAL_OPEN":
      return { ...state, isFormModalOpen: action.isOpen };
    case "SET_UPLOAD_MODAL_OPEN":
      return { ...state, isUploadModalOpen: action.isOpen };
    case "SET_PRE_FILLED_DATA":
      return { ...state, preFilledData: action.data };
  }
}

function initTransactionsState(initial: string | null): TransactionsState {
  // Support legacy `?category=` and new `?tag=` (single tag id) entry points.
  return {
    selectedTransactionId: null,
    filters: {
      category: initial && !looksLikeUuid(initial) ? initial : undefined,
      tagIds: initial && looksLikeUuid(initial) ? [initial] : undefined,
      sortBy: "transaction_date",
      sortOrder: "desc",
    },
    isFormModalOpen: false,
    isUploadModalOpen: false,
    preFilledData: undefined,
  };
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function Transactions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 1024px)");
  const [state, dispatch] = useReducer(
    transactionsReducer,
    searchParams.get("category"),
    initTransactionsState
  );
  const {
    selectedTransactionId,
    filters,
    isFormModalOpen,
    isUploadModalOpen,
    preFilledData,
  } = state;

  // Live transaction derived from the TanStack cache. Re-renders whenever
  // any `transactions.*` query mutates (optimistic updates from report
  // assignments, tag edits, archive operations, etc.).
  const selectedTransaction = useLiveTransaction(selectedTransactionId);

  const [, setSearchParams] = useSearchParams();

  // When navigated from a realtime notification (?id=xxx), select that transaction
  useEffect(() => {
    const transactionId = searchParams.get("id");
    if (!transactionId) return;
    dispatch({ type: "SELECT_TRANSACTION", transactionId });

    setSearchParams(prev => {
      prev.delete("id");
      return prev;
    });
  }, [searchParams, setSearchParams]);

  const { deleteTransaction, updateTransaction, createTransaction } =
    useTransactionMutations();
  const { setTransactionTags } = useTagMutations();
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      if (selectedTransactionId === id)
        dispatch({ type: "SELECT_TRANSACTION", transactionId: null });
      toast.success(t("transactions.deleteSuccess"));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error(t("transactions.deleteError"));
      throw error;
    }
  };

  const handleUpdateTransaction = async (
    id: string,
    _updates: Partial<Transaction>
  ) => {
    try {
      await updateTransaction(id, _updates);
      // The selectedTransaction is derived from the live cache, so the
      // optimistic update in the mutation flows through automatically —
      // no manual state merge needed here.
      toast.success(t("transactions.updateSuccess"));
    } catch (error) {
      console.error("Error updating transaction:", error);
      toast.error(t("transactions.updateError"));
      throw error;
    }
  };

  const handleUploadSuccess = useCallback(
    (transactionId: string) => {
      toast.success(t("upload.success", "Document processed successfully!"));
      navigate(`/transactions?id=${transactionId}`);
    },
    [t, navigate]
  );

  const handleUploadError = useCallback(
    (error: string) => {
      toast.error(t("upload.error", "Upload failed: {{error}}", { error }));
    },
    [t]
  );

  const handleCreateTransaction = async (formData: TransactionFormData) => {
    const transaction = await createTransaction(
      mapTransactionFormDataToInsert(formData)
    );
    if (pendingTagIds.length > 0) {
      try {
        await setTransactionTags({
          transactionId: transaction.id,
          tagIds: pendingTagIds,
        });
      } catch (error) {
        console.error("Error assigning tags to new transaction:", error);
      }
    }
    navigate(`/transactions?id=${transaction.id}`);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] lg:h-full gap-4">
      {/* Filter card: title+description render immediately;
          Currency+Email dropdowns inside have their own Suspense */}
      <div data-tour="transaction-filters">
        <TransactionFiltersComponent
          filters={filters}
          onFiltersChange={f => dispatch({ type: "SET_FILTERS", filters: f })}
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
            onFiltersChange={f => dispatch({ type: "SET_FILTERS", filters: f })}
            selectedTransactionId={selectedTransactionId}
            onSelectTransaction={id =>
              dispatch({ type: "SELECT_TRANSACTION", transactionId: id })
            }
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
            isMobile={isMobile}
          />
        </Suspense>

        {/* Detail panel — always visible */}
        {!isMobile && (
          <div className="flex-1 bg-[var(--bg-secondary)] rounded-lg overflow-y-auto">
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
        {isMobile && selectedTransaction && (
          <div className="fixed inset-0 z-50 bg-[var(--bg-secondary)] lg:hidden">
            <TransactionDetailErrorBoundary>
              <TransactionDetail
                transaction={selectedTransaction}
                onDelete={handleDeleteTransaction}
                onUpdate={handleUpdateTransaction}
                onClose={() =>
                  dispatch({ type: "SELECT_TRANSACTION", transactionId: null })
                }
              />
            </TransactionDetailErrorBoundary>
          </div>
        )}

        <AddTransactionButton
          onManualAdd={() =>
            dispatch({ type: "SET_FORM_MODAL_OPEN", isOpen: true })
          }
          onUpload={() =>
            dispatch({ type: "SET_UPLOAD_MODAL_OPEN", isOpen: true })
          }
        />

        <TransactionFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            dispatch({ type: "SET_FORM_MODAL_OPEN", isOpen: false });
            dispatch({ type: "SET_PRE_FILLED_DATA", data: undefined });
            setPendingTagIds([]);
          }}
          onSave={handleCreateTransaction}
          mode="create"
          initialData={preFilledData}
          initialTagIds={pendingTagIds}
          onTagsChange={setPendingTagIds}
        />

        <UploadTransactionModal
          isOpen={isUploadModalOpen}
          onClose={() =>
            dispatch({ type: "SET_UPLOAD_MODAL_OPEN", isOpen: false })
          }
          onSuccess={handleUploadSuccess}
          onError={handleUploadError}
        />
      </div>
    </div>
  );
}

class TransactionDetailErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, _info: React.ErrorInfo) {
    console.error("TransactionDetail crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <p className="text-red-500">Error loading transaction detail</p>
        </div>
      );
    }
    return this.props.children;
  }
}
