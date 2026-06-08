"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CARD_LABELS, CATEGORIES, type CardType, type Category } from "@/types";
import { CATEGORY_COLORS, TRANSACTIONS_PAGE_SIZE } from "@/lib/constants";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { ShieldCheck } from "lucide-react";
import { AuditDialog } from "@/components/audit-dialog";
import { MobileFilterBar } from "@/components/mobile-filter-bar";
import { TransactionRowCard } from "@/components/transaction-row-card";
import {
  mobileDialogContentClass,
  mobileDialogDescriptionClass,
  mobileDialogFooterClass,
} from "@/lib/mobile-dialog";
import { cn } from "@/lib/utils";

type Tx = {
  _id: string;
  transactionDate: string;
  postDate: string | null;
  merchant: string;
  category: Category;
  cardType: CardType;
  amount: number;
  type: "debit" | "credit" | "payment" | "reward";
  rawDescription: string;
};

type TransactionData = {
  key: string;
  rows: Tx[];
  total: number;
  filteredSpend: number;
  filteredDebitCount: number;
};

type SpendSummaryProps = {
  loading: boolean;
  total: number;
  filteredSpend: number;
  filteredDebitCount: number;
};

function SpendSummary({ loading, total, filteredSpend, filteredDebitCount }: SpendSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Spend</p>
          {loading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums">{fmtCurrency(filteredSpend)}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">purchases only</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Transactions</p>
          {loading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums">{total}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">matching filters</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg per Transaction</p>
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums">
              {filteredDebitCount > 0 ? fmtCurrency(filteredSpend / filteredDebitCount) : "—"}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">purchases only</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionsView() {
  const router = useRouter();
  const params = useSearchParams();

  const search = params.get("search") ?? "";
  const cardType = params.get("cardType") ?? "all";
  const category = params.get("category") ?? "all";
  const startDate = params.get("startDate") ?? "";
  const endDate = params.get("endDate") ?? "";
  const page = Math.max(0, Number(params.get("page") ?? 0));

  const [refreshTick, setRefreshTick] = useState(0);
  const filterKey = `${page}|${search}|${cardType}|${category}|${startDate}|${endDate}|${refreshTick}`;
  const [data, setData] = useState<TransactionData | null>(null);
  const loading = data === null || data.key !== filterKey;
  const rows = data?.key === filterKey ? data.rows : [];
  const total = data?.key === filterKey ? data.total : 0;
  const filteredSpend = data?.key === filterKey ? data.filteredSpend : 0;
  const filteredDebitCount = data?.key === filterKey ? data.filteredDebitCount : 0;

  const [pendingEdit, setPendingEdit] = useState<{
    transactionId: string;
    merchant: string;
    category: Category;
  } | null>(null);
  const [savingScope, setSavingScope] = useState<"single" | "merchant" | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);

  const applyEdit = useCallback(
    async (scope: "single" | "merchant") => {
      if (!pendingEdit) return;
      setSavingScope(scope);
      try {
        const body =
          scope === "single"
            ? {
                scope,
                category: pendingEdit.category,
                transactionId: pendingEdit.transactionId,
              }
            : {
                scope,
                category: pendingEdit.category,
                merchant: pendingEdit.merchant,
              };
        const res = await fetch("/api/transactions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(json.error ?? "Failed to update category");
          return;
        }
        const updated = typeof json.updated === "number" ? json.updated : 0;
        if (scope === "single") {
          toast.success("Updated 1 transaction");
        } else {
          toast.success(`Updated ${updated} transactions for ${pendingEdit.merchant}`);
        }
        setPendingEdit(null);
        setRefreshTick((t) => t + 1);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update category");
      } finally {
        setSavingScope(null);
      }
    },
    [pendingEdit],
  );

  function setParam(key: string, value: string | null, opts: { resetPage?: boolean } = {}) {
    const sp = new URLSearchParams(params.toString());
    if (value === null || value === "") {
      sp.delete(key);
    } else {
      sp.set(key, value);
    }
    if (opts.resetPage) sp.delete("page");
    router.replace(`/transactions?${sp.toString()}`);
  }

  useEffect(() => {
    const ctrl = new AbortController();
    const sp = new URLSearchParams();
    sp.set("limit", String(TRANSACTIONS_PAGE_SIZE));
    sp.set("skip", String(page * TRANSACTIONS_PAGE_SIZE));
    if (search) sp.set("search", search);
    if (cardType !== "all") sp.set("cardType", cardType);
    if (category !== "all") sp.set("category", category);
    if (startDate) sp.set("startDate", startDate);
    if (endDate) sp.set("endDate", endDate);
    (async () => {
      try {
        const res = await fetch(`/api/transactions?${sp.toString()}`, { signal: ctrl.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load transactions" }));
          toast.error(body.error ?? "Failed to load transactions");
          setData({ key: filterKey, rows: [], total: 0, filteredSpend: 0, filteredDebitCount: 0 });
          return;
        }
        const json = await res.json();
        setData({ key: filterKey, rows: json.rows ?? [], total: json.total ?? 0, filteredSpend: json.filteredSpend ?? 0, filteredDebitCount: json.filteredDebitCount ?? 0 });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        toast.error(err instanceof Error ? err.message : "Failed to load transactions");
        setData({ key: filterKey, rows: [], total: 0, filteredSpend: 0, filteredDebitCount: 0 });
      }
    })();
    return () => ctrl.abort();
  }, [filterKey, page, search, cardType, category, startDate, endDate]);

  const pages = Math.max(1, Math.ceil(total / TRANSACTIONS_PAGE_SIZE));

  const filterActiveCount =
    (cardType !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (startDate || endDate ? 1 : 0);

  const filterQuickLabel = [
    cardType !== "all" ? CARD_LABELS[cardType as CardType] : null,
    category !== "all" ? category : null,
    startDate || endDate ? "Custom dates" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function clearDates() {
    const sp = new URLSearchParams(params.toString());
    sp.delete("startDate");
    sp.delete("endDate");
    sp.delete("page");
    router.replace(`/transactions?${sp.toString()}`);
  }

  function renderTransactionFilters() {
    return (
      <>
        <Select
          value={cardType}
          onValueChange={(v) => setParam("cardType", v ?? "all", { resetPage: true })}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cards</SelectItem>
            {Object.entries(CARD_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => setParam("category", v ?? "all", { resetPage: true })}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((entry) => (
              <SelectItem key={entry} value={entry}>
                {entry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() => setAuditOpen(true)}
          disabled={total === 0}
          className="hidden w-full md:inline-flex md:w-auto"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          Audit Categories
        </Button>
        <div className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          <span className="text-sm text-muted-foreground md:w-16">Date range</span>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setParam("startDate", e.target.value || null, { resetPage: true })}
            className="w-full md:w-[160px]"
            aria-label="Start date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setParam("endDate", e.target.value || null, { resetPage: true })}
            className="w-full md:w-[160px]"
            aria-label="End date"
          />
          {startDate || endDate ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDates}
              className="h-9 w-full px-3 text-muted-foreground md:w-auto"
            >
              Clear dates
            </Button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Transactions</h2>
        <p className="text-sm text-muted-foreground">
          {total} total · page {page + 1} of {pages}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search merchant or description"
            value={search}
            onChange={(e) => setParam("search", e.target.value || null, { resetPage: true })}
            className="w-full md:w-72"
          />
          <MobileFilterBar
            activeCount={filterActiveCount}
            quickChips={
              filterQuickLabel ? (
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {filterQuickLabel}
                </span>
              ) : null
            }
            desktopClassName="flex flex-wrap items-center gap-2"
            footer={
              <Button
                variant="outline"
                onClick={() => setAuditOpen(true)}
                disabled={total === 0}
                className="w-full"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Audit Categories
              </Button>
            }
            renderFilters={renderTransactionFilters}
          />
        </CardContent>
      </Card>

      {(loading || total > 0) && (
        <SpendSummary
          loading={loading}
          total={total}
          filteredSpend={filteredSpend}
          filteredDebitCount={filteredDebitCount}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y md:hidden">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2 px-4 py-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No transactions match the filters.
              </p>
            ) : (
              rows.map((tx) => (
                <TransactionRowCard
                  key={tx._id}
                  merchant={tx.merchant}
                  rawDescription={tx.rawDescription}
                  transactionDate={tx.transactionDate}
                  category={tx.category}
                  cardType={tx.cardType}
                  amount={tx.amount}
                  type={tx.type}
                  onCategoryChange={(nextCategory) => {
                    if (nextCategory === tx.category) return;
                    setPendingEdit({
                      transactionId: tx._id,
                      merchant: tx.merchant,
                      category: nextCategory,
                    });
                  }}
                />
              ))
            )}
          </div>
          <div className="hidden md:block">
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
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No transactions match the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell>{fmtDate(tx.transactionDate)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{tx.merchant}</div>
                        {tx.rawDescription && tx.rawDescription !== tx.merchant && (
                          <div className="text-xs text-muted-foreground">{tx.rawDescription}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: CATEGORY_COLORS[tx.category] }}
                          />
                          <Select
                            value={tx.category}
                            onValueChange={(v) => {
                              if (v === tx.category) return;
                              setPendingEdit({
                                transactionId: tx._id,
                                merchant: tx.merchant,
                                category: v as Category,
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 w-[160px]">
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
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {CARD_LABELS[tx.cardType]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {tx.type !== "debit" && "−"}
                        {fmtCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          disabled={page === 0 || loading}
          onClick={() => setParam("page", String(Math.max(0, page - 1)))}
          className="min-h-11 w-full sm:w-auto"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={page + 1 >= pages || loading}
          onClick={() => setParam("page", String(page + 1))}
          className="min-h-11 w-full sm:w-auto"
        >
          Next
        </Button>
      </div>

      <AuditDialog
        open={auditOpen}
        onOpenChange={setAuditOpen}
        onComplete={() => setRefreshTick((t) => t + 1)}
        initialCardType={cardType !== "all" ? (cardType as CardType) : undefined}
        initialCategory={category !== "all" ? (category as Category) : undefined}
      />

      <Dialog
        open={pendingEdit !== null}
        onOpenChange={(open) => {
          if (!open && savingScope === null) setPendingEdit(null);
        }}
      >
        <DialogContent className={cn(mobileDialogContentClass, "sm:max-w-md")}>
          <DialogHeader>
            <DialogTitle>Apply category change</DialogTitle>
            <DialogDescription className={mobileDialogDescriptionClass}>
              {pendingEdit
                ? `Change ${pendingEdit.merchant} to ${pendingEdit.category}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={mobileDialogFooterClass}>
            <Button
              onClick={() => applyEdit("merchant")}
              disabled={savingScope !== null}
            >
              {savingScope === "merchant" ? (
                "Updating…"
              ) : pendingEdit ? (
                <span className="block text-center">
                  <span className="block">Apply to all transactions from</span>
                  <span className="block font-semibold break-words">{pendingEdit.merchant}</span>
                </span>
              ) : (
                ""
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => applyEdit("single")}
              disabled={savingScope !== null}
            >
              {savingScope === "single" ? "Updating…" : "Apply to this transaction only"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <TransactionsView />
    </Suspense>
  );
}
