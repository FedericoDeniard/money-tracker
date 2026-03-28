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
    <section className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm">
      <div className="flex flex-row items-start justify-between gap-2 md:gap-4 md:items-center">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
              {t("subscriptions.title")}
            </h1>
            <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-[10px] md:text-xs font-semibold uppercase tracking-wide text-yellow-800 border border-yellow-300">
              {t("subscriptions.betaLabel")}
            </span>
          </div>
          <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)] line-clamp-2 md:line-clamp-none">
            {t("subscriptions.description")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={
            <RefreshCw
              size={16}
              className={isRefreshing ? "animate-spin" : ""}
            />
          }
          onClick={onRefresh}
          className="shrink-0 h-8 px-2 md:px-3"
        >
          <span className="hidden md:inline">{t("common.refresh")}</span>
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="bg-[var(--bg-secondary)] p-1 rounded-lg flex items-center gap-1 w-full lg:w-auto overflow-x-auto">
          {(["all", "active", "inactive"] as const).map(status => (
            <Button
              key={status}
              onClick={() => onStatusFilterChange(status)}
              variant="outline"
              size="sm"
              selected={statusFilter === status}
              className="flex-1 lg:flex-none text-xs md:text-sm h-8 px-2 md:px-3 whitespace-nowrap"
            >
              {t(`subscriptions.filters.status.${status}`)}
            </Button>
          ))}
        </div>

        <div className="flex flex-row flex-wrap gap-2 items-center justify-between sm:justify-start">
          <div className="bg-[var(--bg-secondary)] p-1 rounded-lg flex items-center gap-1 shrink-0">
            <Button
              onClick={() => onViewModeChange("grid")}
              variant="outline"
              size="sm"
              selected={viewMode === "grid"}
              icon={<Grid3X3 size={14} />}
              className="h-8 px-2 text-xs md:text-sm"
              aria-label={t("subscriptions.filters.view.grid")}
            >
              <span className="hidden sm:inline">
                {t("subscriptions.filters.view.grid")}
              </span>
            </Button>
            <Button
              onClick={() => onViewModeChange("list")}
              variant="outline"
              size="sm"
              selected={viewMode === "list"}
              icon={<List size={14} />}
              className="h-8 px-2 text-xs md:text-sm"
              aria-label={t("subscriptions.filters.view.list")}
            >
              <span className="hidden sm:inline">
                {t("subscriptions.filters.view.list")}
              </span>
            </Button>
          </div>

          <div className="relative group flex-1 min-w-[140px] sm:min-w-[200px]">
            <div className="flex items-center gap-2 px-3 py-1.5 md:py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:border-gray-300 w-full h-8 md:h-9">
              <ArrowUpDown size={14} className="text-gray-500 shrink-0" />
              <span className="text-xs md:text-sm font-medium truncate">
                {t(`subscriptions.filters.sort.${sortBy}`)}
              </span>
            </div>
            <select
              value={sortBy}
              onChange={e =>
                onSortByChange(e.target.value as SubscriptionSortBy)
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label={t("subscriptions.filters.sortLabel")}
            >
              <option value="status">
                {t("subscriptions.filters.sort.status")}
              </option>
              <option value="amount_desc">
                {t("subscriptions.filters.sort.amount_desc")}
              </option>
              <option value="amount_asc">
                {t("subscriptions.filters.sort.amount_asc")}
              </option>
              <option value="next_date_asc">
                {t("subscriptions.filters.sort.next_date_asc")}
              </option>
              <option value="confidence_desc">
                {t("subscriptions.filters.sort.confidence_desc")}
              </option>
              <option value="merchant_asc">
                {t("subscriptions.filters.sort.merchant_asc")}
              </option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              onClick={onClearFilters}
              variant="ghost"
              size="sm"
              icon={<X size={14} />}
              className="text-red-600 hover:bg-red-50 h-8 px-2 text-xs md:text-sm shrink-0"
            >
              <span className="hidden sm:inline">
                {t("subscriptions.filters.clear")}
              </span>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
