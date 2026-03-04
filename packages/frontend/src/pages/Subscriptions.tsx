import { AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { SubscriptionCard, SubscriptionsHeader } from "../components/subscriptions";
import type {
  SubscriptionSortBy,
  SubscriptionStatusFilter,
} from "../components/subscriptions/SubscriptionsHeader";
import { getSubscriptionStatus, getSubscriptionStatusRank } from "../components/subscriptions/subscriptionStatus";
import { useSubscriptionCandidates } from "../hooks/useSubscriptionCandidates";

const DEFAULT_STATUS_FILTER: SubscriptionStatusFilter = "all";
const DEFAULT_SORT_BY: SubscriptionSortBy = "status";

export function Subscriptions() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>(DEFAULT_STATUS_FILTER);
  const [sortBy, setSortBy] = useState<SubscriptionSortBy>(DEFAULT_SORT_BY);
  const {
    data: candidates = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useSubscriptionCandidates({
    minConfidence: 50,
    minOccurrences: 3,
  });

  const visibleCandidates = useMemo(() => {
    const items = candidates.map((candidate, index) => ({
      candidate,
      index,
      status: getSubscriptionStatus(candidate.next_estimated_date),
    }));

    const filtered = items.filter((item) => {
      if (statusFilter === "all") return true;
      return item.status === statusFilter;
    });

    const parseDate = (value: string | null): number | null => {
      if (!value) return null;
      const parsed = new Date(`${value}T00:00:00`).getTime();
      return Number.isNaN(parsed) ? null : parsed;
    };

    filtered.sort((a, b) => {
      if (sortBy === "amount_desc") return b.candidate.avg_amount - a.candidate.avg_amount;
      if (sortBy === "amount_asc") return a.candidate.avg_amount - b.candidate.avg_amount;
      if (sortBy === "confidence_desc") return b.candidate.confidence_score - a.candidate.confidence_score;
      if (sortBy === "merchant_asc") {
        const aName = a.candidate.merchant_display || a.candidate.merchant_normalized;
        const bName = b.candidate.merchant_display || b.candidate.merchant_normalized;
        return aName.localeCompare(bName);
      }
      if (sortBy === "next_date_asc") {
        const aDate = parseDate(a.candidate.next_estimated_date);
        const bDate = parseDate(b.candidate.next_estimated_date);
        if (aDate === null && bDate === null) return a.index - b.index;
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return aDate - bDate;
      }

      // Default sort: active first, then inactive, then unknown.
      const rankDiff = getSubscriptionStatusRank(a.status) - getSubscriptionStatusRank(b.status);
      if (rankDiff !== 0) return rankDiff;

      const aDate = parseDate(a.candidate.next_estimated_date);
      const bDate = parseDate(b.candidate.next_estimated_date);
      if (aDate !== null && bDate !== null && aDate !== bDate) return aDate - bDate;

      return a.index - b.index;
    });

    return filtered.map((item) => item.candidate);
  }, [candidates, sortBy, statusFilter]);

  const hasActiveFilters = statusFilter !== DEFAULT_STATUS_FILTER || sortBy !== DEFAULT_SORT_BY;

  const clearFilters = () => {
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setSortBy(DEFAULT_SORT_BY);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)]">
        <EmptyState
          icon={AlertCircle}
          title={t("errors.loadingError")}
          action={{
            label: t("common.retry"),
            onClick: () => {
              refetch();
            },
          }}
        />
      </section>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SubscriptionsHeader
        isRefreshing={isFetching}
        onRefresh={() => refetch()}
        statusFilter={statusFilter}
        sortBy={sortBy}
        onStatusFilterChange={setStatusFilter}
        onSortByChange={setSortBy}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {candidates.length === 0 ? (
        <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)]">
          <EmptyState
            icon={AlertCircle}
            title={t("subscriptions.emptyTitle")}
            description={t("subscriptions.emptyDescription")}
          />
        </section>
      ) : visibleCandidates.length === 0 ? (
        <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)]">
          <EmptyState
            icon={AlertCircle}
            title={t("subscriptions.filteredEmptyTitle")}
            description={t("subscriptions.filteredEmptyDescription")}
            action={{
              label: t("subscriptions.filters.clear"),
              onClick: clearFilters,
            }}
          />
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCandidates.map((candidate) => (
            <SubscriptionCard
              key={`${candidate.merchant_normalized}-${candidate.currency}`}
              candidate={candidate}
            />
          ))}
        </section>
      )}
    </div>
  );
}
