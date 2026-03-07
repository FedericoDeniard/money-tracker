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
  "#3d5a80", // Slate Blue (Base brand)
  "#34d399", // Soft Emerald
  "#6366f1", // Muted Indigo
  "#fb7185", // Warm Coral
  "#fbbf24", // Golden Amber
  "#38bdf8", // Pale Cerulean
  "#a78bfa", // Lavender
  "#f43f5e", // Rose
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data.length) {
    return (
      <div className="h-[320px] flex items-center justify-center text-[var(--text-secondary)]">
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

    // Pull lines closer and shrink text slightly on mobile to prevent viewport clipping
    const armOffset = isMobile ? 3 : 8;
    const elbowOffset = isMobile ? 8 : 20;
    const tailLength = isMobile ? 6 : 12;

    const sx = cx + (outerRadius + armOffset) * cos;
    const sy = cy + (outerRadius + armOffset) * sin;
    const mx = cx + (outerRadius + elbowOffset) * cos;
    const my = cy + (outerRadius + elbowOffset) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * tailLength;
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

        <text x={ex + (cos >= 0 ? 1 : -1) * (isMobile ? 4 : 8)} y={ey} dy={-2} textAnchor={textAnchor} fill="var(--text-primary)" style={{ fontSize: isMobile ? '11px' : '13px', fontWeight: 'bold' }}>
          {`$${value.toFixed(2)}`}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * (isMobile ? 4 : 8)} y={ey} dy={14} textAnchor={textAnchor} fill="var(--text-secondary)" style={{ fontSize: isMobile ? '10px' : '12px' }}>
          {`(${(percent * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full pb-4 md:pb-0">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 320}>
          <PieChart style={{ overflow: "visible" }}>
            <Pie
              // @ts-expect-error Recharts typings issue
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              key={`pie-${data.length}-${data.map((d) => d.amount).join("-")}`}
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 45 : 80}
              outerRadius={isMobile ? 65 : 110}
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
    </div>
  );
}
