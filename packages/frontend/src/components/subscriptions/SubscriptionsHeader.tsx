import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

interface SubscriptionsHeaderProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function SubscriptionsHeader({ isRefreshing, onRefresh }: SubscriptionsHeaderProps) {
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
    </section>
  );
}
