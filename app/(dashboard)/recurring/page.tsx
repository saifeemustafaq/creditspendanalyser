"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecurringAlerts } from "@/components/recurring-alerts";
import { RecurringAddDialog } from "@/components/recurring-add-dialog";
import { RecurringItemsTable } from "@/components/recurring-items-table";
import { RecurringOverrideDialog } from "@/components/recurring-override-dialog";
import { RECURRING_FREQUENCIES } from "@/lib/constants";
import { fmtCurrency } from "@/lib/format";
import type {
  RecurringFrequency,
  RecurringItem,
  RecurringStatus,
  RecurringSummary,
  TransactionType,
} from "@/types";

type SortKey = "amount" | "frequency" | "nextExpected" | "merchant";

const EMPTY_SUMMARY: RecurringSummary = {
  totalMonthlyRecurring: 0,
  totalAnnualRecurring: 0,
  activeCount: 0,
  alerts: [],
  items: [],
};

function frequencyOrder(f: RecurringFrequency): number {
  return RECURRING_FREQUENCIES.indexOf(f);
}

function coerceSummary(raw: unknown): RecurringSummary {
  if (!raw || typeof raw !== "object") return EMPTY_SUMMARY;
  const r = raw as Record<string, unknown>;
  return {
    totalMonthlyRecurring: typeof r.totalMonthlyRecurring === "number" ? r.totalMonthlyRecurring : 0,
    totalAnnualRecurring: typeof r.totalAnnualRecurring === "number" ? r.totalAnnualRecurring : 0,
    activeCount: typeof r.activeCount === "number" ? r.activeCount : 0,
    alerts: Array.isArray(r.alerts) ? (r.alerts as RecurringSummary["alerts"]) : [],
    items: Array.isArray(r.items) ? (r.items as RecurringItem[]) : [],
  };
}

function RecurringView() {
  const router = useRouter();
  const params = useSearchParams();

  const typeFilter = (params.get("type") ?? "all") as TransactionType | "all";
  const statusFilter = (params.get("status") ?? "all") as RecurringStatus | "all";
  const freqFilter = (params.get("freq") ?? "all") as RecurringFrequency | "all";
  const sortKey = (params.get("sort") ?? "amount") as SortKey;

  const [refreshTick, setRefreshTick] = useState(0);
  const [data, setData] = useState<RecurringSummary | null>(null);
  const filterKey = `${typeFilter}|${statusFilter}|${refreshTick}`;
  const [loadedKey, setLoadedKey] = useState<string>("");
  const loading = data === null || loadedKey !== filterKey;

  const [overrideTarget, setOverrideTarget] = useState<RecurringItem | null>(null);
  const [dismissingMerchant, setDismissingMerchant] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const sp = new URLSearchParams();
    if (typeFilter !== "all") sp.set("type", typeFilter);
    if (statusFilter !== "all") sp.set("status", statusFilter);
    (async () => {
      try {
        const res = await fetch(`/api/recurring?${sp.toString()}`, { signal: ctrl.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load recurring items" }));
          toast.error(body.error ?? "Failed to load recurring items");
          setData(EMPTY_SUMMARY);
          setLoadedKey(filterKey);
          return;
        }
        const raw: unknown = await res.json();
        setData(coerceSummary(raw));
        setLoadedKey(filterKey);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        toast.error(err instanceof Error ? err.message : "Failed to load recurring items");
        setLoadedKey(filterKey);
      }
    })();
    return () => ctrl.abort();
  }, [filterKey, typeFilter, statusFilter]);

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (value === null || value === "" || value === "all") {
      sp.delete(key);
    } else {
      sp.set(key, value);
    }
    router.replace(`/recurring?${sp.toString()}`);
  }

  const visibleItems = useMemo(() => {
    if (!data) return [];
    let rows = data.items;
    if (freqFilter !== "all") rows = rows.filter((i) => i.frequency === freqFilter);
    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "amount":
          return b.averageAmount - a.averageAmount;
        case "frequency":
          return frequencyOrder(a.frequency) - frequencyOrder(b.frequency);
        case "nextExpected": {
          const an = a.nextExpected ? new Date(a.nextExpected).getTime() : Infinity;
          const bn = b.nextExpected ? new Date(b.nextExpected).getTime() : Infinity;
          return an - bn;
        }
        case "merchant":
          return a.merchant.localeCompare(b.merchant);
      }
    });
    return rows;
  }, [data, freqFilter, sortKey]);

  const possiblyCancelledCount = useMemo(
    () => (data?.items ?? []).filter((i) => i.status === "possibly_cancelled").length,
    [data],
  );

  const dismissItem = useCallback(async (item: RecurringItem) => {
    setDismissingMerchant(item.merchant);
    try {
      const res = await fetch("/api/recurring/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: item.merchant,
          type: item.type,
          action: "dismiss",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to dismiss");
        return;
      }
      toast.success(`${item.merchant} dismissed`);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss");
    } finally {
      setDismissingMerchant(null);
    }
  }, []);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Recurring</h2>
          <p className="text-sm text-muted-foreground">
            Detected subscriptions and regularly-occurring charges from your transactions.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add recurring
        </Button>
      </div>

      {data && <RecurringAlerts alerts={data.alerts} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Monthly recurring"
          value={loading ? "—" : fmtCurrency(data?.totalMonthlyRecurring ?? 0)}
        />
        <SummaryCard
          label="Annual projection"
          value={loading ? "—" : fmtCurrency(data?.totalAnnualRecurring ?? 0)}
        />
        <SummaryCard
          label="Active subscriptions"
          value={loading ? "—" : String(data?.activeCount ?? 0)}
        />
        <SummaryCard
          label="Possibly cancelled"
          value={loading ? "—" : String(possiblyCancelledCount)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setParam("type", v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="debit">Debits</SelectItem>
                <SelectItem value="credit">Credits</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setParam("status", v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="possibly_cancelled">Possibly cancelled</SelectItem>
                <SelectItem value="new">New</SelectItem>
              </SelectContent>
            </Select>
            <Select value={freqFilter} onValueChange={(v) => setParam("freq", v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any frequency</SelectItem>
                {RECURRING_FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={(v) => setParam("sort", v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Sort: amount</SelectItem>
                <SelectItem value="frequency">Sort: frequency</SelectItem>
                <SelectItem value="nextExpected">Sort: next expected</SelectItem>
                <SelectItem value="merchant">Sort: merchant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <RecurringItemsTable
        items={visibleItems}
        loading={loading}
        dismissingMerchant={dismissingMerchant}
        onOverride={setOverrideTarget}
        onDismiss={dismissItem}
      />

      <RecurringOverrideDialog
        item={overrideTarget}
        onOpenChange={(open) => {
          if (!open) setOverrideTarget(null);
        }}
        onSaved={refresh}
      />

      <RecurringAddDialog open={addOpen} onOpenChange={setAddOpen} onSaved={refresh} />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function RecurringPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <RecurringView />
    </Suspense>
  );
}
