import { ArrowUpDown, Grid3X3, List, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

export type SubscriptionStatusFilter = "all" | "active" | "inactive";
export type SubscriptionSortBy =
  | "status"
  | "amount_desc"
  | "amount_asc"
  | "next_date_asc"
  | "confidence_desc"
  | "merchant_asc";
export type SubscriptionViewMode = "grid" | "list";

interface SubscriptionsHeaderProps {
  isRefreshing: boolean;
  onRefresh: () => void;
  statusFilter: SubscriptionStatusFilter;
  sortBy: SubscriptionSortBy;
  onStatusFilterChange: (status: SubscriptionStatusFilter) => void;
  onSortByChange: (sort: SubscriptionSortBy) => void;
  viewMode: SubscriptionViewMode;
  onViewModeChange: (viewMode: SubscriptionViewMode) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function SubscriptionsHeader({
  isRefreshing,
  onRefresh,
  statusFilter,
  sortBy,
  onStatusFilterChange,
  onSortByChange,
  viewMode,
  onViewModeChange,
  onClearFilters,
  hasActiveFilters,
}: SubscriptionsHeaderProps) {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("subscriptions.title")}
            </h1>
            <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-yellow-800 border border-yellow-300">
              {t("subscriptions.betaLabel")}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("subscriptions.description")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />}
          onClick={onRefresh}
        >
          {t("common.refresh")}
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="bg-[var(--bg-secondary)] p-1 rounded-lg flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
          {(["all", "active", "inactive"] as const).map((status) => (
            <Button
              key={status}
              onClick={() => onStatusFilterChange(status)}
              variant="outline"
              size="sm"
              selected={statusFilter === status}
              className="flex-1 lg:flex-none"
            >
              {t(`subscriptions.filters.status.${status}`)}
            </Button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="bg-[var(--bg-secondary)] p-1 rounded-lg flex items-center gap-1">
            <Button
              onClick={() => onViewModeChange("grid")}
              variant="outline"
              size="sm"
              selected={viewMode === "grid"}
              icon={<Grid3X3 size={14} />}
            >
              {t("subscriptions.filters.view.grid")}
            </Button>
            <Button
              onClick={() => onViewModeChange("list")}
              variant="outline"
              size="sm"
              selected={viewMode === "list"}
              icon={<List size={14} />}
            >
              {t("subscriptions.filters.view.list")}
            </Button>
          </div>

          <div className="relative group">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:border-gray-300 min-w-[220px]">
              <ArrowUpDown size={14} className="text-gray-500" />
              <span className="text-sm font-medium truncate">
                {t(`subscriptions.filters.sort.${sortBy}`)}
              </span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SubscriptionSortBy)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label={t("subscriptions.filters.sortLabel")}
            >
              <option value="status">{t("subscriptions.filters.sort.status")}</option>
              <option value="amount_desc">{t("subscriptions.filters.sort.amount_desc")}</option>
              <option value="amount_asc">{t("subscriptions.filters.sort.amount_asc")}</option>
              <option value="next_date_asc">{t("subscriptions.filters.sort.next_date_asc")}</option>
              <option value="confidence_desc">{t("subscriptions.filters.sort.confidence_desc")}</option>
              <option value="merchant_asc">{t("subscriptions.filters.sort.merchant_asc")}</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              onClick={onClearFilters}
              variant="ghost"
              size="sm"
              icon={<X size={14} />}
              className="text-red-600 hover:bg-red-50"
            >
              {t("subscriptions.filters.clear")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
