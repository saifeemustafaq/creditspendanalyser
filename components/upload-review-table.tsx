"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, type CategorizationMethod, type Category } from "@/types";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Sparkles, TriangleAlert, Zap } from "lucide-react";
import type { PreviewTransaction } from "@/lib/services/extraction-pipeline";

export type AISummary = {
  sent: number;
  categorized: number;
  topCategories: Array<{ category: string; count: number }>;
};

const METHOD_LABEL: Record<CategorizationMethod, string> = {
  source_map: "Issuer",
  user_override: "Saved",
  rule: "Rule",
  ai: "AI",
  user: "Manual",
};

function methodVariant(
  method: CategorizationMethod,
): "default" | "secondary" | "outline" {
  if (method === "source_map" || method === "user_override") return "default";
  if (method === "user") return "secondary";
  return "outline";
}

type IndexedRow = { originalIndex: number; tx: PreviewTransaction };

function duplicateBadge(tx: PreviewTransaction) {
  if (!tx.isDuplicate) return null;
  const label =
    tx.duplicateReason === "in_file" ? "Duplicate in file" : "Already imported";
  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

function TransactionTableRows({
  rows,
  onChangeCategory,
  readOnly = false,
}: {
  rows: IndexedRow[];
  onChangeCategory: (index: number, category: Category) => void;
  readOnly?: boolean;
}) {
  return (
    <>
      {rows.map(({ originalIndex, tx }) => (
        <TableRow
          key={originalIndex}
          className={cn(readOnly && "opacity-60")}
        >
          <TableCell className="whitespace-nowrap">
            {fmtDate(tx.transactionDate)}
          </TableCell>
          <TableCell className="font-medium">{tx.merchant}</TableCell>
          <TableCell
            className="hidden lg:table-cell max-w-[240px] truncate text-xs text-muted-foreground"
            title={tx.rawDescription}
          >
            {tx.rawDescription.split(/\r?\n/)[0]}
          </TableCell>
          <TableCell>
            {readOnly ? (
              <span className="text-xs">{tx.category}</span>
            ) : (
              <Select
                value={tx.category}
                onValueChange={(v) =>
                  v && onChangeCategory(originalIndex, v as Category)
                }
              >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </TableCell>
          <TableCell>
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant={methodVariant(tx.categorizedBy)}>
                {METHOD_LABEL[tx.categorizedBy]}
              </Badge>
              {duplicateBadge(tx)}
            </div>
          </TableCell>
          <TableCell
            className={cn(
              "text-right tabular-nums whitespace-nowrap",
              tx.type !== "debit" && "text-muted-foreground",
            )}
          >
            {tx.type === "debit"
              ? fmtCurrency(tx.amount)
              : `-${fmtCurrency(tx.amount)}`}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function TransactionTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Date</TableHead>
        <TableHead>Merchant</TableHead>
        <TableHead className="hidden lg:table-cell">Description</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Source</TableHead>
        <TableHead className="text-right">Amount</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export type UploadReviewTableProps = {
  rows: PreviewTransaction[];
  onChangeCategory: (index: number, category: Category) => void;
  onAICategorize: () => void;
  aiLoading: boolean;
  aiSummary: AISummary | null;
};

export function UploadReviewTable({
  rows,
  onChangeCategory,
  onAICategorize,
  aiLoading,
  aiSummary,
}: UploadReviewTableProps) {
  const [showDuplicates, setShowDuplicates] = useState(false);

  const { uncategorized, categorized, duplicates, duplicateCounts, summary } =
    useMemo(() => {
      const uncat: IndexedRow[] = [];
      const cat: IndexedRow[] = [];
      const dup: IndexedRow[] = [];
      let totalSpend = 0;
      let skippedExisting = 0;
      let skippedInFile = 0;
      const counts: Record<CategorizationMethod, number> = {
        source_map: 0,
        user_override: 0,
        rule: 0,
        ai: 0,
        user: 0,
      };

      rows.forEach((tx, i) => {
        if (tx.isDuplicate) {
          dup.push({ originalIndex: i, tx });
          if (tx.duplicateReason === "in_file") skippedInFile += 1;
          else skippedExisting += 1;
          return;
        }
        if (tx.type === "debit") totalSpend += tx.amount;
        counts[tx.categorizedBy]++;

        if (tx.category === "Other" && tx.type === "debit") {
          uncat.push({ originalIndex: i, tx });
        } else {
          cat.push({ originalIndex: i, tx });
        }
      });

      const newCount = rows.length - dup.length;
      return {
        uncategorized: uncat,
        categorized: cat,
        duplicates: dup,
        duplicateCounts: { skippedExisting, skippedInFile, newCount },
        summary: { totalSpend, counts, total: newCount },
      };
    }, [rows]);

  const dupTotal = duplicates.length;

  return (
    <div className="space-y-6">
      {dupTotal > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {duplicateCounts.newCount} new
            </span>
            {duplicateCounts.skippedExisting > 0 && (
              <>
                {" "}
                · {duplicateCounts.skippedExisting} already imported
              </>
            )}
            {duplicateCounts.skippedInFile > 0 && (
              <>
                {" "}
                · {duplicateCounts.skippedInFile} duplicate{" "}
                {duplicateCounts.skippedInFile === 1 ? "line" : "lines"} in file
              </>
            )}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDuplicates((v) => !v)}
          >
            {showDuplicates ? "Hide skipped" : `Show skipped (${dupTotal})`}
          </Button>
        </div>
      )}
      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="flex items-start gap-3 rounded-md border border-blue-500/30 bg-blue-50/50 px-4 py-3 dark:bg-blue-950/20">
          <Zap className="mt-0.5 size-4 shrink-0 text-blue-500" />
          <div className="text-sm">
            <p className="font-medium">
              AI categorized {aiSummary.categorized} of {aiSummary.sent}{" "}
              transactions
            </p>
            {aiSummary.topCategories.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {aiSummary.topCategories.map((tc) => (
                  <Badge key={tc.category} variant="secondary" className="text-xs">
                    {tc.category}: {tc.count}
                  </Badge>
                ))}
              </div>
            )}
            {aiSummary.sent > aiSummary.categorized && (
              <p className="mt-1 text-muted-foreground">
                {aiSummary.sent - aiSummary.categorized} still need manual
                categorization below.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Section A: Needs Attention */}
      <Card
        className={cn(
          "border-2",
          uncategorized.length > 0
            ? "border-amber-500/40"
            : "border-emerald-500/40",
        )}
      >
        <CardHeader className="pb-3">
          {uncategorized.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TriangleAlert className="size-5 text-amber-500" />
                <CardTitle className="text-base">
                  Needs attention
                  <Badge variant="outline" className="ml-2">
                    {uncategorized.length}
                  </Badge>
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={aiLoading}
                onClick={onAICategorize}
              >
                {aiLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Auto-categorize with AI
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-500" />
              <CardTitle className="text-base">All transactions categorized</CardTitle>
            </div>
          )}
          {uncategorized.length > 0 && (
            <CardDescription>
              These transactions couldn&apos;t be categorized automatically.
              Use AI or pick a category manually.
            </CardDescription>
          )}
        </CardHeader>
        {uncategorized.length > 0 && (
          <CardContent className="p-0">
            <Table>
              <TransactionTableHeader />
              <TableBody>
                <TransactionTableRows
                  rows={uncategorized}
                  onChangeCategory={onChangeCategory}
                />
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* Section B: Categorized */}
      {categorized.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Categorized ({categorized.length})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TransactionTableHeader />
              <TableBody>
                <TransactionTableRows
                  rows={categorized}
                  onChangeCategory={onChangeCategory}
                />
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showDuplicates && dupTotal > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Skipped duplicates ({dupTotal})
          </h3>
          <div className="rounded-md border">
            <Table>
              <TransactionTableHeader />
              <TableBody>
                <TransactionTableRows
                  rows={duplicates}
                  onChangeCategory={onChangeCategory}
                  readOnly
                />
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <div>
          <span className="font-medium">{summary.total}</span>{" "}
          <span className="text-muted-foreground">new transactions</span>{" "}
          <span className="text-muted-foreground">·</span>{" "}
          <span className="font-medium">{fmtCurrency(summary.totalSpend)}</span>{" "}
          <span className="text-muted-foreground">total spend</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {(Object.keys(summary.counts) as CategorizationMethod[])
            .filter((k) => summary.counts[k] > 0)
            .map((k) => (
              <Badge key={k} variant="outline">
                {METHOD_LABEL[k]}: {summary.counts[k]}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}
