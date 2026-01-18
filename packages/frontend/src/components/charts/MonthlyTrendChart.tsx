import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "react-i18next";

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
      <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <p className="text-sm">{t("metrics.noData")}</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--text-secondary)/20"
        />
        <XAxis
          dataKey="month"
          stroke="var(--text-secondary)"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
        />
        <YAxis
          stroke="var(--text-secondary)"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          tickFormatter={(value) => (value ? `$${value}` : "")}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--text-secondary)/20",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "var(--text-primary)" }}
          itemStyle={{ color: "var(--text-primary)" }}
          formatter={(value: number | undefined) =>
            value ? [`$${value.toFixed(2)}`, ""] : ["", ""]
          }
        />
        <Legend
          wrapperStyle={{ color: "var(--text-primary)" }}
          formatter={(value) => {
            if (value === "income") return t("metrics.totalIncome");
            if (value === "expense") return t("metrics.totalExpense");
            if (value === "net") return t("metrics.netBalance");
            return value;
          }}
        />
        <Line
          type="monotone"
          dataKey="income"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="expense"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ fill: "#ef4444", r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
