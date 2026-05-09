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
import { CARD_LABELS, type CardType, type Category } from "@/types";
import { fmtCurrency, monthLabel } from "@/lib/format";
import { CARD_COLORS, CATEGORY_COLORS } from "@/lib/constants";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CategoryChart({ data }: { data: Array<{ _id: string; total: number }> }) {
  const rows = data.map((d, i) => ({
    name: d._id,
    total: d.total,
    fill: CATEGORY_COLORS[d._id as Category] ?? PALETTE[i % PALETTE.length],
  }));
  const config: ChartConfig = Object.fromEntries(
    rows.map((r) => [r.name, { label: r.name, color: r.fill }]),
  ) as ChartConfig;
  return (
    <ChartContainer config={config} className="mx-auto aspect-square max-h-[280px]">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => [`${fmtCurrency(Number(value))} `, String(name)]}
              hideLabel
            />
          }
        />
        <Pie data={rows} dataKey="total" nameKey="name" innerRadius={60} outerRadius={100}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.fill} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
      </PieChart>
    </ChartContainer>
  );
}

export function MonthlyTrendChart({
  data,
}: {
  data: Array<{ _id: { y: number; m: number }; total: number }>;
}) {
  const rows = data.map((d) => ({
    month: monthLabel(d._id.y, d._id.m),
    total: d.total,
  }));
  const config = { total: { label: "Spend", color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      <BarChart data={rows}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(v) => `$${Math.round(Number(v))}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(v) => fmtCurrency(Number(v))} />
          }
        />
        <Bar dataKey="total" fill="var(--color-total)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export function CardComparisonChart({
  data,
}: {
  data: Array<{ _id: string; total: number }>;
}) {
  const rows = data.map((d, i) => ({
    name: CARD_LABELS[d._id as CardType] ?? d._id,
    total: d.total,
    fill: CARD_COLORS[d._id as CardType] ?? PALETTE[i % PALETTE.length],
  }));
  const config = { total: { label: "Spend", color: "var(--chart-2)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 32 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(v) => `$${Math.round(Number(v))}`}
        />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={12} width={140} />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(v) => fmtCurrency(Number(v))} />}
        />
        <Bar dataKey="total" radius={4}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function TopMerchantsChart({
  data,
}: {
  data: Array<{ _id: string; total: number }>;
}) {
  const rows = data.map((d, i) => ({
    name: d._id,
    total: d.total,
    fill: PALETTE[i % PALETTE.length],
  }));
  const config = { total: { label: "Spend", color: "var(--chart-3)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="h-[320px] w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          tickFormatter={(v) => `$${Math.round(Number(v))}`}
        />
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} fontSize={11} width={160} />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(v) => fmtCurrency(Number(v))} />}
        />
        <Bar dataKey="total" radius={4}>
          {rows.map((r) => (
            <Cell key={r.name} fill={r.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
