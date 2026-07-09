import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";
import { MetricCard } from "../metrics/MetricCard";
import { getCurrencySymbol } from "../../utils/currency";

interface KpiRowProps {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number | null;
  changes: {
    income: number | null;
    expense: number | null;
    netBalance: number | null;
    savingsRate: number | null;
  };
  displayCurrency: string;
}

export function KpiRow({
  totalIncome,
  totalExpense,
  netBalance,
  savingsRate,
  changes,
  displayCurrency,
}: KpiRowProps) {
  const { t } = useTranslation();
  const symbol = getCurrencySymbol(displayCurrency);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title={t("dashboardOverview.kpi.income")}
        value={`${symbol}${totalIncome.toFixed(2)}`}
        change={changes.income}
        icon={<TrendingUp className="size-5" />}
        currency={displayCurrency}
      />
      <MetricCard
        title={t("dashboardOverview.kpi.expense")}
        value={`${symbol}${totalExpense.toFixed(2)}`}
        change={changes.expense}
        icon={<TrendingDown className="size-5" />}
        currency={displayCurrency}
      />
      <MetricCard
        title={t("dashboardOverview.kpi.net")}
        value={`${symbol}${netBalance.toFixed(2)}`}
        change={changes.netBalance}
        icon={<DollarSign className="size-5" />}
        currency={displayCurrency}
      />
      <MetricCard
        title={t("dashboardOverview.kpi.savingsRate")}
        value={savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`}
        change={changes.savingsRate}
        icon={<PiggyBank className="size-5" />}
        currency={displayCurrency}
      />
    </div>
  );
}
