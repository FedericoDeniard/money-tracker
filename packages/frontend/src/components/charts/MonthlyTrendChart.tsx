
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTranslation } from "react-i18next";
import { InsufficientData } from "../ui/InsufficientData";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyData[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
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

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        stackOffset="sign"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
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
          itemSorter={(item: { dataKey?: unknown }) => (item.dataKey === "income" ? -1 : 1)}
          formatter={(value: unknown, name: unknown) => {
            if (value === undefined || value === null) return ["", ""];
            const numericValue = typeof value === 'number' ? value : Number(value);
            const absValue = Math.abs(numericValue);
            let label = "";
            if (name === "income") label = t("metrics.totalIncome");
            if (name === "expense") label = t("metrics.totalExpense");
            return [`$${absValue.toFixed(2)}`, label];
          }}
        />
        <Legend
          wrapperStyle={{ color: "var(--text-primary)" }}
          formatter={(value) => {
            if (value === "income") return t("metrics.totalIncome");
            if (value === "expense") return t("metrics.totalExpense");
            return value;
          }}
        />
        <Bar
          dataKey="income"
          stackId="a"
          fill="#34d399"
        />
        <Bar
          dataKey="expense"
          stackId="a"
          fill="#f43f5e"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
