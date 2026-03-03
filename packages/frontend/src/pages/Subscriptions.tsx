import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { SubscriptionCard, SubscriptionsHeader } from "../components/subscriptions";
import { useSubscriptionCandidates } from "../hooks/useSubscriptionCandidates";

export function Subscriptions() {
  const { t } = useTranslation();
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
      <SubscriptionsHeader isRefreshing={isFetching} onRefresh={() => refetch()} />

      {candidates.length === 0 ? (
        <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)]">
          <EmptyState
            icon={AlertCircle}
            title={t("subscriptions.emptyTitle")}
            description={t("subscriptions.emptyDescription")}
          />
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => (
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
