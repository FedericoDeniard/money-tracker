import { useMemo } from "react";
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

  // Calculate Y-axis ticks to ensure 0 is always shown
  const yAxisTicks = useMemo(() => {
    if (!data.length) return [0];

    const allValues = data.flatMap((d) => [d.income, d.expense]);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Always include 0 in the range
    const rangeMin = Math.min(min, 0);
    const rangeMax = Math.max(max, 0);

    // Generate approximately 5 ticks
    const ticks = new Set<number>();
    const range = rangeMax - rangeMin;
    const step = range / 4;

    for (let i = 0; i <= 4; i++) {
      const tick = rangeMin + step * i;
      ticks.add(Math.round(tick));
    }

    // Force 0 to be included
    ticks.add(0);

    return Array.from(ticks).sort((a, b) => a - b);
  }, [data]);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
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
    <ResponsiveContainer width="100%" height={256}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        barCategoryGap="20%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--text-secondary)/20"
        />
        <ReferenceLine
          y={0}
          stroke="var(--text-primary)"
          strokeWidth={2}
          strokeOpacity={0.5}
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
        />
        <YAxis
          stroke="var(--text-secondary)"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          ticks={yAxisTicks}
          tickFormatter={(value) => {
            if (Math.abs(value) >= 1000) {
              return `$${(value / 1000).toFixed(1)}k`;
            }
            return `$${value.toFixed(0)}`;
          }}
          domain={[
            (dataMin: number) => Math.min(dataMin, 0),
            (dataMax: number) => Math.max(dataMax, 0),
          ]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--text-secondary)/20",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "var(--text-primary)" }}
          itemStyle={{ color: "var(--text-primary)" }}
          formatter={(value: number | undefined, name: string | undefined) => {
            if (!value) return ["", ""];
            const absValue = Math.abs(value);
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
          fill="#10b981"
          radius={[4, 4, 0, 0]}
          animationBegin={0}
          animationDuration={500}
        />
        <Bar
          dataKey="expense"
          fill="#ef4444"
          radius={[0, 0, 4, 4]}
          animationBegin={0}
          animationDuration={500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
