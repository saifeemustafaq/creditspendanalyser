"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useContainerWidth } from "@/hooks/use-container-width";
import { CARD_LABELS, type CardType, type Category } from "@/types";
import { fmtCurrency, monthLabel } from "@/lib/format";
import { CARD_COLORS, CATEGORY_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const MOBILE_CATEGORY_LIMIT = 6;

type PieRow = { name: string; total: number; fill: string };

function truncateLabel(label: string, maxLength = 14): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 1)}…`;
}

function condenseCategoryRows(rows: PieRow[], isCompact: boolean): PieRow[] {
  if (!isCompact || rows.length <= MOBILE_CATEGORY_LIMIT) return rows;

  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, MOBILE_CATEGORY_LIMIT - 1);
  const otherTotal = sorted.slice(MOBILE_CATEGORY_LIMIT - 1).reduce((sum, row) => sum + row.total, 0);

  return [
    ...top,
    {
      name: "Other categories",
      total: otherTotal,
      fill: CATEGORY_COLORS.Other,
    },
  ];
}

function CategoryLegend({ rows, className }: { rows: PieRow[]; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-3 gap-y-2.5", className)}>
      {rows.map((row) => (
        <li key={row.name} className="flex min-w-0 items-center gap-2 text-xs">
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: row.fill }}
            aria-hidden
          />
          <span className="truncate text-muted-foreground">{row.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function CategoryChart({ data }: { data: Array<{ _id: string; total: number }> }) {
  const { ref, isCompact, isNarrow } = useContainerWidth();

  const allRows: PieRow[] = data.map((entry, index) => ({
    name: entry._id,
    total: entry.total,
    fill: CATEGORY_COLORS[entry._id as Category] ?? PALETTE[index % PALETTE.length],
  }));
  const rows = condenseCategoryRows(allRows, isCompact);
  const config: ChartConfig = Object.fromEntries(
    rows.map((row) => [row.name, { label: row.name, color: row.fill }]),
  ) as ChartConfig;

  const useExternalLegend = isNarrow;

  if (useExternalLegend) {
    return (
      <div ref={ref} className="w-full min-w-0">
        <ChartContainer
          config={config}
          className="mx-auto aspect-auto h-[200px] w-full [&_.recharts-wrapper]:mx-auto"
        >
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [`${fmtCurrency(Number(value))} `, String(name)]}
                  hideLabel
                />
              }
            />
            <Pie
              data={rows}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={78}
            >
              {rows.map((row) => (
                <Cell key={row.name} fill={row.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <CategoryLegend rows={rows} className="mt-3 px-1" />
      </div>
    );
  }

  const innerRadius = isCompact ? 54 : 60;
  const outerRadius = isCompact ? 86 : 96;

  return (
    <div ref={ref} className="w-full min-w-0">
      <ChartContainer
        config={config}
        className="mx-auto aspect-auto h-[280px] w-full md:h-[300px] [&_.recharts-wrapper]:mx-auto"
      >
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => [`${fmtCurrency(Number(value))} `, String(name)]}
                hideLabel
              />
            }
          />
          <Pie
            data={rows}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="48%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
          >
            {rows.map((row) => (
              <Cell key={row.name} fill={row.fill} />
            ))}
          </Pie>
          <ChartLegend
            content={
              <ChartLegendContent
                nameKey="name"
                className="flex-row flex-wrap items-center justify-center gap-3"
              />
            }
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}

export function MonthlyTrendChart({
  data,
}: {
  data: Array<{ _id: { y: number; m: number }; total: number }>;
}) {
  const { ref, isCompact, isNarrow } = useContainerWidth();
  const rows = data.map((entry) => ({
    month: monthLabel(entry._id.y, entry._id.m),
    total: entry.total,
  }));
  const config = { total: { label: "Spend", color: "var(--chart-1)" } } satisfies ChartConfig;

  return (
    <div ref={ref} className="w-full min-w-0">
      <ChartContainer config={config} className="h-[240px] w-full md:h-[280px]">
        <BarChart
          data={rows}
          margin={{ top: 8, right: 8, left: 0, bottom: isNarrow ? 28 : 8 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            fontSize={isCompact ? 10 : 12}
            angle={isNarrow ? -45 : 0}
            textAnchor={isNarrow ? "end" : "middle"}
            height={isNarrow ? 56 : 30}
            interval={isCompact ? "preserveStartEnd" : 0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={isCompact ? 10 : 12}
            width={isCompact ? 44 : 56}
            tickFormatter={(value) => `$${Math.round(Number(value))}`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent formatter={(value) => fmtCurrency(Number(value))} />
            }
          />
          <Bar dataKey="total" fill="var(--color-total)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function CardComparisonChart({
  data,
}: {
  data: Array<{ _id: string; total: number }>;
}) {
  const { ref, isCompact } = useContainerWidth();
  const rows = data.map((entry, index) => ({
    name: CARD_LABELS[entry._id as CardType] ?? entry._id,
    total: entry.total,
    fill: CARD_COLORS[entry._id as CardType] ?? PALETTE[index % PALETTE.length],
  }));
  const config = { total: { label: "Spend", color: "var(--chart-2)" } } satisfies ChartConfig;
  const yAxisWidth = isCompact ? 72 : 140;

  return (
    <div ref={ref} className="w-full min-w-0">
      <ChartContainer config={config} className="h-[220px] w-full md:h-[260px]">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={isCompact ? 10 : 12}
            tickFormatter={(value) => `$${Math.round(Number(value))}`}
          />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            fontSize={isCompact ? 10 : 12}
            width={yAxisWidth}
            tickFormatter={(value) => truncateLabel(String(value), isCompact ? 10 : 18)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => fmtCurrency(Number(value))}
                labelFormatter={(label) => String(label)}
              />
            }
          />
          <Bar dataKey="total" radius={4}>
            {rows.map((row) => (
              <Cell key={row.name} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function TopMerchantsChart({
  data,
}: {
  data: Array<{ _id: string; total: number }>;
}) {
  const { ref, isCompact } = useContainerWidth();
  const rows = data.map((entry, index) => ({
    name: entry._id,
    total: entry.total,
    fill: PALETTE[index % PALETTE.length],
  }));
  const config = { total: { label: "Spend", color: "var(--chart-3)" } } satisfies ChartConfig;
  const yAxisWidth = isCompact ? 88 : 160;

  return (
    <div ref={ref} className="w-full min-w-0">
      <ChartContainer config={config} className="h-[280px] w-full md:h-[320px]">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            fontSize={isCompact ? 10 : 12}
            tickFormatter={(value) => `$${Math.round(Number(value))}`}
          />
          <YAxis
            dataKey="name"
            type="category"
            tickLine={false}
            axisLine={false}
            fontSize={isCompact ? 10 : 11}
            width={yAxisWidth}
            tickFormatter={(value) => truncateLabel(String(value), isCompact ? 12 : 22)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => fmtCurrency(Number(value))}
                labelFormatter={(label) => String(label)}
              />
            }
          />
          <Bar dataKey="total" radius={4}>
            {rows.map((row) => (
              <Cell key={row.name} fill={row.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
