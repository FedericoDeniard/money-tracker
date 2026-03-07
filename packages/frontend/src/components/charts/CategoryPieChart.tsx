import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
}

interface ChartDataItem {
  name: string;
  value: number;
  percentage: number;
  [key: string]: string | number;
}

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <p className="text-sm">{t("metrics.noData")}</p>
        </div>
      </div>
    );
  }

  const chartData: ChartDataItem[] = data.slice(0, 8).map((item) => ({
    name: t(`categories.${item.category}`),
    value: item.amount,
    percentage: item.percentage,
  }));

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const renderActiveShape = (props: unknown) => {
    const RADIAN = Math.PI / 180;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props as any;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);

    // Start line strictly outside the expanded hover sector (outerRadius + 6)
    const sx = cx + (outerRadius + 8) * cos;
    const sy = cy + (outerRadius + 8) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    // Safely truncate name so it never escapes the donut hole
    const shortName = payload.name.length > 20 ? payload.name.substring(0, 20) + '...' : payload.name;

    return (
      <g>
        <text x={cx} y={cy} dy={4} textAnchor="middle" fill={fill} style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {shortName}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 2}
          outerRadius={outerRadius + 6}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />

        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={-2} textAnchor={textAnchor} fill="var(--text-primary)" style={{ fontSize: '13px', fontWeight: 'bold' }}>
          {`$${value.toFixed(2)}`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={14} textAnchor={textAnchor} fill="var(--text-secondary)" style={{ fontSize: '12px' }}>
          {`(${(percent * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
      <div className="w-full md:w-[65%] pb-4 md:pb-0">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 280}>
          <PieChart style={{ overflow: "visible" }}>
            <Pie
              // @ts-expect-error Recharts typings issue
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              key={`pie-${data.length}-${data.map((d) => d.amount).join("-")}`}
              data={chartData}
              cx={isMobile ? "50%" : "45%"}
              cy="50%"
              innerRadius={isMobile ? 55 : 60}
              outerRadius={isMobile ? 70 : 80}
              paddingAngle={5}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              animationBegin={0}
              animationDuration={500}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}-${entry.value}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{ outline: "none" }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full md:w-[35%] flex flex-col justify-center pl-0 md:pl-2">
        <ul className="space-y-3">
          {chartData.map((entry, index) => (
            <li
              key={`legend-${index}`}
              className="flex items-center justify-between text-sm transition-colors hover:bg-[var(--bg-secondary)] rounded-lg p-1 -mx-1 cursor-default"
              onMouseEnter={() => setActiveIndex(index)}
            >
              <div className="flex items-center gap-2 overflow-hidden min-w-0" style={{ flexShrink: 1 }}>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-[var(--text-primary)] truncate font-medium" title={entry.name}>
                  {entry.name}
                </span>
              </div>
              <div className="flex items-center justify-end overflow-hidden ml-2 text-[var(--text-secondary)] min-w-0" style={{ flexShrink: 99999 }}>
                <span className="truncate" title={`$${entry.value.toFixed(2)}`}>
                  ${entry.value.toFixed(2)}
                </span>
                <span className="whitespace-nowrap flex-shrink-0 ml-1">
                  ({entry.percentage.toFixed(0)}%)
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
