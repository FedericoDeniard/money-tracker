import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface CategoryTreeMapChartProps {
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

interface CustomizedContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  depth?: number;
  value?: number | string;
  percentage?: number | string;
  root?: { value?: number };
}

const CustomizedContent = (props: CustomizedContentProps) => {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    index = 0,
    name = "",
    depth,
  } = props;

  // Treemap renders a root wrapper node at depth 0; we only want to style the actual category children (depth === 1)
  if (depth === 0) return null;

  const value = Number(props.value || 0);
  // Recharts Treemap geometry can sometimes strip custom fields, so we fallback to calculating the percentage if undefined
  const percentage =
    props.percentage !== undefined
      ? Number(props.percentage)
      : props.root?.value
        ? (value / props.root.value) * 100
        : 0;

  // Provide a base rectangle even if the box is too small to fit text
  if (width < 30 || height < 30) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: "var(--bg-primary)",
          strokeWidth: 2,
        }}
      />
    );
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: "var(--bg-primary)",
          strokeWidth: 2,
        }}
      />
      {width > 60 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 8}
            textAnchor="middle"
            fill="#ffffff"
            style={{ fontSize: 13, fontWeight: "bold" }}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#ffffff"
            style={{ fontSize: 11, opacity: 0.9 }}
          >
            {`$${value.toFixed(2)} (${percentage.toFixed(0)}%)`}
          </text>
        </>
      )}
    </g>
  );
};

export function CategoryTreeMapChart({ data }: CategoryTreeMapChartProps) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!data.length) {
    return (
      <div className="h-[320px] flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <p className="text-sm">{t("metrics.noData")}</p>
        </div>
      </div>
    );
  }

  const chartData: ChartDataItem[] = data.slice(0, 8).map(item => ({
    name: t(`categories.${item.category}`),
    value: item.amount,
    percentage: item.percentage,
  }));

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full pb-4 md:pb-0">
        <ResponsiveContainer width="100%" height={isMobile ? 300 : 320}>
          <Treemap
            data={chartData}
            dataKey="value"
            stroke="#fff"
            fill="#8884d8"
            animationDuration={500}
            animationEasing="ease-out"
            content={<CustomizedContent />}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--text-secondary)/20",
                borderRadius: "8px",
              }}
              labelStyle={{
                color: "var(--text-primary)",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
              itemStyle={{ color: "var(--text-primary)" }}
              formatter={(
                value:
                  | number
                  | string
                  | readonly (string | number)[]
                  | undefined,
                _: string | number | undefined,
                props: { payload?: ChartDataItem }
              ) => {
                const itemData = props.payload;
                // In some complex shapes Recharts might wrap values in arrays, cast defensively
                const numericValue = Array.isArray(value) ? value[0] : value;
                return [
                  `$${Number(numericValue || 0).toFixed(2)} (${itemData?.percentage?.toFixed(1) || 0}%)`,
                  itemData?.name || "",
                ];
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
