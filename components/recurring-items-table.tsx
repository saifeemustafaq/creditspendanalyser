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
  dismissingMerchant: string | null;
  onOverride: (item: RecurringItem) => void;
  onDismiss: (item: RecurringItem) => void;
}

export function RecurringItemsTable({
  items,
  loading,
  dismissingMerchant,
  onOverride,
  onDismiss,
}: Props) {
  return (
    <Card>
      <CardContent className="p-0">
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
                <TableRow key={`${item.merchant}-${item.type}`}>
                  <TableCell>
                    <div className="font-medium">{item.merchant}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {item.type}
                    </div>
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
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View transactions for ${item.merchant}`}
                        render={
                          <Link
                            href={`/transactions?search=${encodeURIComponent(item.merchant)}`}
                          />
                        }
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onOverride(item)}
                        aria-label={`Override frequency for ${item.merchant}`}
                      >
                        <Repeat className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={dismissingMerchant === item.merchant}
                        onClick={() => onDismiss(item)}
                        aria-label={`Dismiss ${item.merchant}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
