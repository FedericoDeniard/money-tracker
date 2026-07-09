import { Suspense, useCallback, useMemo, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { TransactionFormModal } from "../components/transactions/TransactionFormModal";
import type { TransactionFormData } from "../components/transactions/TransactionFormModal";
import { UploadTransactionModal } from "../components/transactions/UploadTransactionModal";
import { Greeting } from "../components/dashboard/Greeting";
import { KpiRow } from "../components/dashboard/KpiRow";
import { DashboardCharts } from "../components/dashboard/DashboardCharts";
import { RecentTransactions } from "../components/dashboard/RecentTransactions";
import { OnboardingSteps } from "../components/dashboard/OnboardingSteps";
import { useAuth } from "../hooks/useAuth";
import { useSeedNotifications } from "../hooks/useSeedNotifications";
import { useTransactionMutations } from "../hooks/useTransactionMutations";
import { useTransactions } from "../hooks/useTransactions";
import { useReports } from "../hooks/useReports";
import { useMetricsData } from "../hooks/useMetricsData";
import { toast } from "../utils/toast";
import { mapTransactionFormDataToInsert } from "../utils/transactionForm";
import { SuspenseFallback } from "../components/ui/SuspenseFallback";
import { currentYearMonth, getDateRange } from "../utils/period";

// ─── Data section — suspends while queries load ─────────────────────────────
interface DashboardContentProps {
  onSelectTransaction: (transactionId: string) => void;
  onUpload: () => void;
  onAddManually: () => void;
}

interface CategoryDatum {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

function DashboardContent({
  onSelectTransaction,
  onUpload,
  onAddManually,
}: DashboardContentProps) {
  const dateRange = useMemo(
    () => getDateRange({ kind: "month", yearMonth: currentYearMonth() }),
    []
  );

  const { metrics, filteredTransactions } = useMetricsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    previousStartDate: dateRange.previousStartDate,
    previousEndDate: dateRange.previousEndDate,
    selectedCurrency: "all",
  });

  const { data: activeReports } = useReports("active");
  const reportsById = useMemo(
    () => new Map((activeReports ?? []).map(r => [r.id, r])),
    [activeReports]
  );

  const { data: recentData } = useTransactions({
    filters: { sortBy: "transaction_date", sortOrder: "desc" },
  });
  const recentTransactions = useMemo(() => {
    if (!recentData) return [];
    const seen = new Set<string>();
    const out = [];
    for (const page of recentData.pages) {
      for (const tx of page.transactions) {
        if (seen.has(tx.id)) continue;
        seen.add(tx.id);
        out.push(tx);
        if (out.length >= 5) return out;
      }
    }
    return out;
  }, [recentData]);

  const displayCurrency = filteredTransactions[0]?.currency || "USD";

  const hasTransactions = filteredTransactions.length > 0;

  const categoryData = useMemo((): CategoryDatum[] => {
    if (!filteredTransactions.length) return [];
    const total = metrics.totalExpense;
    const categoryMap = new Map<string, { amount: number; count: number }>();
    for (const tx of filteredTransactions) {
      if (tx.transaction_type !== "expense") continue;
      const category = tx.category || "other";
      if (!categoryMap.has(category))
        categoryMap.set(category, { amount: 0, count: 0 });
      const data = categoryMap.get(category);
      if (!data) continue;
      data.amount += tx.amount;
      data.count += 1;
    }
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, metrics.totalExpense]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm">
        <Greeting />
      </section>

      <KpiRow
        totalIncome={metrics.totalIncome}
        totalExpense={metrics.totalExpense}
        netBalance={metrics.netBalance}
        savingsRate={metrics.savingsRate}
        changes={metrics.changes}
        displayCurrency={displayCurrency}
      />

      <DashboardCharts categoryData={categoryData} hasData={hasTransactions} />

      {hasTransactions ? (
        <RecentTransactions
          transactions={recentTransactions}
          reportsById={reportsById}
          onSelectTransaction={onSelectTransaction}
        />
      ) : (
        <OnboardingSteps onUpload={onUpload} onAddManually={onAddManually} />
      )}
    </div>
  );
}

// ─── Page shell — renders immediately (no data dependency) ───────────────────
interface HomeState {
  isCreateModalOpen: boolean;
  isUploadModalOpen: boolean;
}

type HomeAction =
  | { type: "SET_CREATE_MODAL_OPEN"; isOpen: boolean }
  | { type: "SET_UPLOAD_MODAL_OPEN"; isOpen: boolean };

function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case "SET_CREATE_MODAL_OPEN":
      return { ...state, isCreateModalOpen: action.isOpen };
    case "SET_UPLOAD_MODAL_OPEN":
      return { ...state, isUploadModalOpen: action.isOpen };
  }
}

const initialHomeState: HomeState = {
  isCreateModalOpen: false,
  isUploadModalOpen: false,
};

export function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();
  useSeedNotifications(user?.id);

  const { createTransaction } = useTransactionMutations();
  const [state, dispatch] = useReducer(homeReducer, initialHomeState);
  const { isCreateModalOpen, isUploadModalOpen } = state;
  const navigate = useNavigate();

  const handleCreateTransaction = async (formData: TransactionFormData) => {
    await createTransaction(mapTransactionFormDataToInsert(formData));
    dispatch({ type: "SET_CREATE_MODAL_OPEN", isOpen: false });
  };

  const handleSelectTransaction = useCallback(
    (transactionId: string) => {
      navigate(`/transactions?id=${transactionId}`);
    },
    [navigate]
  );

  return (
    <div className="space-y-6 pb-8 animate-in fade-in duration-500">
      {user?.id && (
        <Suspense fallback={<SuspenseFallback rows={6} />}>
          <DashboardContent
            onSelectTransaction={handleSelectTransaction}
            onUpload={() =>
              dispatch({ type: "SET_UPLOAD_MODAL_OPEN", isOpen: true })
            }
            onAddManually={() =>
              dispatch({ type: "SET_CREATE_MODAL_OPEN", isOpen: true })
            }
          />
        </Suspense>
      )}

      <TransactionFormModal
        isOpen={isCreateModalOpen}
        onClose={() =>
          dispatch({ type: "SET_CREATE_MODAL_OPEN", isOpen: false })
        }
        onSave={handleCreateTransaction}
        mode="create"
      />

      <UploadTransactionModal
        isOpen={isUploadModalOpen}
        onClose={() =>
          dispatch({ type: "SET_UPLOAD_MODAL_OPEN", isOpen: false })
        }
        onSuccess={transactionId =>
          navigate(`/transactions?id=${transactionId}`)
        }
        onError={error => toast.error(t("common.error"), error)}
      />
    </div>
  );
}
