import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
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

  const chartData = data.slice(0, 8).map(item => ({
    name: t(`categories.${item.category}`),
    value: item.amount,
    percentage: item.percentage,
  }));

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { name: string; value: number; percentage: number };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--text-secondary)/20 rounded-lg p-3">
          <p className="text-[var(--text-primary)] font-medium">{data.name}</p>
          <p className="text-[var(--text-secondary)]">
            ${data.value.toFixed(2)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: { percentage: number }) => {
    return `${entry.percentage.toFixed(0)}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          wrapperStyle={{ paddingLeft: "20px" }}
          formatter={(value: string, entry: { payload: { value: number } }) => (
            <span style={{ color: "var(--text-primary)" }}>
              {value} (${entry.payload.value.toFixed(2)})
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
