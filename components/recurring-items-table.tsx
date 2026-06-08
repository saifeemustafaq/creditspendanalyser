"use client";

import Link from "next/link";
import { ExternalLink, Repeat, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/components/category-badge";
import { fmtCurrency, fmtDate } from "@/lib/format";
import type { RecurringItem, RecurringStatus } from "@/types";

const STATUS_LABELS: Record<RecurringStatus, string> = {
  active: "Active",
  possibly_cancelled: "Possibly cancelled",
  new: "New",
};

const STATUS_VARIANTS: Record<RecurringStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  new: "secondary",
  possibly_cancelled: "destructive",
};

interface Props {
  items: RecurringItem[];
  loading: boolean;
  dismissingItemId: string | null;
  onOverride: (item: RecurringItem) => void;
  onDismiss: (item: RecurringItem) => void;
}

function RecurringItemActions({
  item,
  dismissingItemId,
  onOverride,
  onDismiss,
}: {
  item: RecurringItem;
  dismissingItemId: string | null;
  onOverride: (item: RecurringItem) => void;
  onDismiss: (item: RecurringItem) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={`View transactions for ${item.merchant}`}
        render={
          <Link href={`/transactions?search=${encodeURIComponent(item.merchant)}`} />
        }
      >
        <ExternalLink className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        onClick={() => onOverride(item)}
        aria-label={`Override frequency for ${item.merchant}`}
      >
        <Repeat className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        disabled={dismissingItemId === item.id}
        onClick={() => onDismiss(item)}
        aria-label={`Dismiss ${item.merchant}`}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

function RecurringItemCard({
  item,
  dismissingItemId,
  onOverride,
  onDismiss,
}: {
  item: RecurringItem;
  dismissingItemId: string | null;
  onOverride: (item: RecurringItem) => void;
  onDismiss: (item: RecurringItem) => void;
}) {
  return (
    <div className="border-b px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium">{item.merchant}</p>
          <p className="text-xs capitalize text-muted-foreground">{item.type}</p>
        </div>
        <p className="shrink-0 font-semibold tabular-nums">
          {item.isVariable ? (
            <>
              {fmtCurrency(item.averageAmount)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">±</span>
            </>
          ) : (
            fmtCurrency(item.averageAmount)
          )}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANTS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
        <CategoryBadge category={item.category} />
        <span className="text-xs capitalize text-muted-foreground">
          {item.frequency.replace("-", " ")}
          {item.userOverride === "frequency_override" ? " (override)" : ""}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Next: {fmtDate(item.nextExpected)}</span>
        <span className="tabular-nums">Annual {fmtCurrency(item.totalAnnualCost)}</span>
      </div>
      <div className="mt-2 flex justify-end">
        <RecurringItemActions
          item={item}
          dismissingItemId={dismissingItemId}
          onOverride={onOverride}
          onDismiss={onDismiss}
        />
      </div>
    </div>
  );
}

export function RecurringItemsTable({
  items,
  loading,
  dismissingItemId,
  onOverride,
  onDismiss,
}: Props) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y md:hidden">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 px-4 py-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          ) : items.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              <Repeat className="mx-auto mb-2 size-6 text-muted-foreground/50" />
              No recurring items yet. Upload at least 2 months of statements so the detector has
              enough history to spot patterns.
            </p>
          ) : (
            items.map((item) => (
              <RecurringItemCard
                key={item.id}
                item={item}
                dismissingItemId={dismissingItemId}
                onOverride={onOverride}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next expected</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Annual</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    <Repeat className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                    No recurring items yet. Upload at least 2 months of statements so the
                    detector has enough history to spot patterns.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.merchant}</div>
                      <div className="text-xs capitalize text-muted-foreground">{item.type}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.isVariable ? (
                        <span
                          title={`avg ${fmtCurrency(item.averageAmount)} · σ ${fmtCurrency(item.amountStdDev)}`}
                        >
                          {fmtCurrency(item.averageAmount)}
                          <span className="ml-1 text-xs text-muted-foreground">±</span>
                        </span>
                      ) : (
                        fmtCurrency(item.averageAmount)
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {item.frequency.replace("-", " ")}
                      {item.userOverride === "frequency_override" && (
                        <span className="ml-1 text-xs text-muted-foreground">(override)</span>
                      )}
                    </TableCell>
                    <TableCell>{fmtDate(item.nextExpected)}</TableCell>
                    <TableCell>
                      <CategoryBadge category={item.category} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[item.status]}>
                        {STATUS_LABELS[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(item.totalAnnualCost)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <RecurringItemActions
                          item={item}
                          dismissingItemId={dismissingItemId}
                          onOverride={onOverride}
                          onDismiss={onDismiss}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
