import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { aggregateInsights } from "@/lib/models/transactions";
import { rangeToDates, type RangeKey } from "@/lib/range";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CARD_LABELS, type Category } from "@/types";
import type { CardType } from "@/types";
import { CATEGORY_COLORS, SUMMARY_ACCENT } from "@/lib/constants";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { CategoryBadge } from "@/components/category-badge";
import { DashboardFilters } from "@/components/dashboard-filters";
import {
  CardComparisonChart,
  CategoryChart,
  MonthlyTrendChart,
  TopMerchantsChart,
} from "@/components/insight-charts";

export const dynamic = "force-dynamic";

interface SearchParams {
  range?: string;
  cardType?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const sp = await searchParams;

  const range = (sp.range as RangeKey) ?? "12m";
  const cardType = (sp.cardType as CardType | "all") ?? "all";
  const { startDate, endDate } = rangeToDates(range);

  const insights = await aggregateInsights({
    userId: session.userId,
    startDate,
    endDate,
    cardType,
  });

  const totalSpend = insights.summary?.total ?? 0;
  const txCount = insights.summary?.count ?? 0;
  const topCategory = insights.byCategory[0]?._id ?? "—";

  // Month-over-month
  const trend = insights.monthlyTrend;
  const lastMonth = trend[trend.length - 1];
  const prevMonth = trend[trend.length - 2];
  const last = lastMonth?.total ?? 0;
  const prev = prevMonth?.total ?? 0;
  const momPct = prev > 0 ? ((last - prev) / prev) * 100 : null;

  // Transaction type breakdown for tooltip
  const debitCount = insights.typeCounts.find((t) => t._id === "debit");
  const creditCount = insights.typeCounts.find((t) => t._id === "credit");
  const paymentCount = insights.typeCounts.find((t) => t._id === "payment");

  const empty = txCount === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {startDate ? `${fmtDate(startDate)} – ${fmtDate(endDate ?? new Date())}` : "All time"}
          </p>
        </div>
        <DashboardFilters />
      </div>

      {empty ? (
        <Card>
          <CardHeader>
            <CardTitle>No transactions yet</CardTitle>
            <CardDescription>
              Upload your first statement to start seeing insights.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Total spend"
              value={fmtCurrency(totalSpend)}
              accentColor={SUMMARY_ACCENT.spend}
            />
            <SummaryCard
              label="Transactions"
              value={txCount.toString()}
              accentColor={SUMMARY_ACCENT.count}
              tooltip={
                <div className="flex flex-col gap-1">
                  <div className="font-medium">Transaction breakdown</div>
                  <div className="flex justify-between gap-4">
                    <span>Purchases</span>
                    <span className="tabular-nums">{debitCount?.count ?? 0} · {fmtCurrency(debitCount?.total ?? 0)}</span>
                  </div>
                  {(paymentCount?.count ?? 0) > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Payments</span>
                      <span className="tabular-nums">{paymentCount?.count ?? 0} · {fmtCurrency(paymentCount?.total ?? 0)}</span>
                    </div>
                  )}
                  {(creditCount?.count ?? 0) > 0 && (
                    <div className="flex justify-between gap-4">
                      <span>Credits/refunds</span>
                      <span className="tabular-nums">{creditCount?.count ?? 0} · {fmtCurrency(creditCount?.total ?? 0)}</span>
                    </div>
                  )}
                </div>
              }
            />
            <SummaryCard
              label="Top category"
              value={topCategory}
              accentColor={
                topCategory in CATEGORY_COLORS
                  ? CATEGORY_COLORS[topCategory as Category]
                  : CATEGORY_COLORS.Other
              }
            />
            <SummaryCard
              label="Month-over-month"
              value={momPct === null ? "—" : `${momPct >= 0 ? "+" : ""}${momPct.toFixed(1)}%`}
              tone={momPct === null ? "neutral" : momPct >= 0 ? "warn" : "good"}
              accentColor={
                momPct === null
                  ? SUMMARY_ACCENT.neutral
                  : momPct >= 0
                    ? SUMMARY_ACCENT.negative
                    : SUMMARY_ACCENT.positive
              }
              tooltip={
                momPct === null ? (
                  <div>Not enough data to compare two months.</div>
                ) : (
                  <>
                    <div className="font-medium mb-1">
                      % change in spending vs. previous month
                    </div>
                    <div>
                      {fmtMonthLabel(lastMonth!._id)}: {fmtCurrency(last)}
                    </div>
                    <div>
                      {fmtMonthLabel(prevMonth!._id)}: {fmtCurrency(prev)}
                    </div>
                  </>
                )
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spending by category</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryChart data={insights.byCategory} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Monthly trend</CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyTrendChart data={insights.monthlyTrend} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Spend by card</CardTitle>
              </CardHeader>
              <CardContent>
                <CardComparisonChart data={insights.byCard} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top merchants</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMerchantsChart data={insights.topMerchants} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.recent.map((tx) => (
                    <TableRow key={tx._id.toString()}>
                      <TableCell>{fmtDate(tx.transactionDate)}</TableCell>
                      <TableCell className="font-medium">{tx.merchant}</TableCell>
                      <TableCell>
                        <CategoryBadge category={tx.category} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {CARD_LABELS[tx.cardType]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {tx.type !== "debit" && "−"}
                        {fmtCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtMonthLabel(id: { y: number; m: number }): string {
  return `${MONTH_NAMES[id.m]} ${id.y}`;
}

function SummaryCard({
  label,
  value,
  tone,
  accentColor,
  tooltip,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
  accentColor?: string;
  tooltip?: React.ReactNode;
}) {
  const content = (
    <Card
      className={cn("border-l-4", accentColor && "border-l-[color:var(--accent-c)]")}
      style={
        accentColor ? ({ "--accent-c": accentColor } as React.CSSProperties) : undefined
      }
    >
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tone === "good" && "text-emerald-600",
            tone === "warn" && "text-amber-600",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );

  if (!tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>
        {content}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
