import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AlertCircle } from "lucide-react";

function InsufficientData() {
  const { t } = useTranslation();
  return (
    <div className="h-[320px] flex flex-col items-center justify-center text-[var(--text-secondary)]">
      <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{t("metrics.needMoreData")}</p>
      <p className="text-xs opacity-75 mt-1">{t("metrics.minimumMonths")}</p>
    </div>
  );
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface MonthlyAreaChartProps {
  data: MonthlyData[];
}

export function MonthlyAreaChart({ data }: MonthlyAreaChartProps) {
  const { t } = useTranslation();

  if (!data.length) {
    return (
      <div className="h-[320px] flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <p className="text-sm">{t("metrics.noData")}</p>
        </div>
      </div>
    );
  }

  if (data.length < 2) {
    return <InsufficientData />;
  }

  // To make expenses render nicely on a stacked area chart below income instead of stacking directly
  // we need to pass positive expense values to the chart so it stacks, but negative ones if we want to reverse scale?
  // Recharts handles stackOffset="sign" perfectly for this, so we need expenses to be negative just like they already are in the data.

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart
        data={data}
        stackOffset="sign"
        margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            {/* Note: expenses are negative so the gradient should probably look solid from the axis downwards, but AreaChart handles standard fills decently */}
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--text-secondary)"
          strokeOpacity={0.2}
          vertical={true}
          horizontal={true}
        />
        <ReferenceLine y={0} stroke="var(--text-primary)" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
        />
        <YAxis
          type="number"
          scale="linear"
          stroke="var(--text-secondary)"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          tickFormatter={(value: number) => {
            if (value === 0) return "$0";
            if (Math.abs(value) >= 1000) {
              return `$${(value / 1000).toFixed(1)}k`;
            }
            return `$${value.toFixed(0)}`;
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--text-secondary)/20",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "var(--text-primary)" }}
          itemSorter={(item: { dataKey?: unknown }) =>
            item.dataKey === "income" ? -1 : 1
          }
          formatter={(value: unknown, name: unknown) => {
            if (value === undefined || value === null) return ["", ""];
            const numericValue =
              typeof value === "number" ? value : Number(value);
            const absValue = Math.abs(numericValue);
            let label = "";
            if (name === "income") label = t("metrics.totalIncome");
            if (name === "expense") label = t("metrics.totalExpense");
            return [`$${absValue.toFixed(2)}`, label];
          }}
        />
        <Legend
          wrapperStyle={{ color: "var(--text-primary)" }}
          formatter={value => {
            if (value === "income") return t("metrics.totalIncome");
            if (value === "expense") return t("metrics.totalExpense");
            return value;
          }}
        />
        <Area
          type="monotone"
          dataKey="income"
          stackId="1"
          stroke="#34d399"
          fill="url(#colorIncome)"
        />
        <Area
          type="monotone"
          dataKey="expense"
          stackId="1"
          stroke="#f43f5e"
          fill="url(#colorExpense)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
