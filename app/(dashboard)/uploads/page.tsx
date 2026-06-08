"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CARD_LABELS, type CardType, type CategorizationMethod, type UploadStats } from "@/types";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { CardBadge } from "@/components/card-badge";
import {
  mobileDialogContentClass,
  mobileDialogDescriptionClass,
  mobileDialogFooterClass,
} from "@/lib/mobile-dialog";
import { cn } from "@/lib/utils";

interface StatementRow {
  _id: string;
  cardType: CardType;
  originalFilename: string;
  fileFormat: string;
  statementDate: string | null;
  uploadedAt: string;
  transactionCount: number;
  totalAmount: number;
  uploadStats?: UploadStats;
}

const METHOD_LABELS: Record<CategorizationMethod, string> = {
  source_map: "Issuer",
  rule: "Rule",
  ai: "AI",
  user: "User",
  user_override: "Override",
};

const METHOD_VARIANTS: Record<
  CategorizationMethod,
  "default" | "secondary" | "outline" | "destructive"
> = {
  source_map: "secondary",
  rule: "secondary",
  ai: "outline",
  user: "default",
  user_override: "default",
};

function CategorizationBadges({ stats }: { stats?: UploadStats }) {
  if (!stats) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const entries = (Object.entries(stats.categorization) as [CategorizationMethod, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const skippedDup = stats.rowsSkippedDuplicate ?? 0;
  const skippedFile = stats.rowsSkippedInFile ?? 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {entries.map(([method, count]) => (
          <Badge key={method} variant={METHOD_VARIANTS[method]}>
            {METHOD_LABELS[method]} {count}
          </Badge>
        ))}
        {stats.uncategorized > 0 && (
          <Badge variant="destructive">Other {stats.uncategorized}</Badge>
        )}
      </div>
      {(skippedDup > 0 || skippedFile > 0) && (
        <span className="text-xs text-muted-foreground">
          Skipped {skippedDup + skippedFile} duplicate
          {skippedDup + skippedFile === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

export default function UploadsPage() {
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StatementRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/statements", { signal: ctrl.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load uploads" }));
          toast.error(body.error ?? "Failed to load uploads");
          setRows([]);
          return;
        }
        const json = await res.json();
        setRows(json.rows ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        toast.error(err instanceof Error ? err.message : "Failed to load uploads");
        setRows([]);
      }
    })();
    return () => ctrl.abort();
  }, [refreshTick]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/statements/${pendingDelete._id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to delete upload");
        return;
      }
      const removed = typeof json.deletedTransactions === "number" ? json.deletedTransactions : 0;
      toast.success(`Deleted upload · ${removed} transactions removed`);
      setPendingDelete(null);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete upload");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  const loading = rows === null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Uploads</h2>
        <p className="text-sm text-muted-foreground">
          Past statement uploads with categorization breakdown. Deleting an upload
          removes its transactions but keeps your category overrides.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y md:hidden">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 px-4 py-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No uploads yet.</p>
            ) : (
              rows.map((row) => (
                <div key={row._id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium" title={row.originalFilename}>
                        {row.originalFilename}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {fmtDate(row.uploadedAt)} · {row.fileFormat.toUpperCase()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      onClick={() => setPendingDelete(row)}
                      aria-label={`Delete upload ${row.originalFilename}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CardBadge cardType={row.cardType} />
                    <span className="text-xs text-muted-foreground">
                      {row.transactionCount} tx · {fmtCurrency(row.totalAmount)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <CategorizationBadges stats={row.uploadStats} />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Card</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Categorization</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No uploads yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row._id}>
                      <TableCell>{fmtDate(row.uploadedAt)}</TableCell>
                      <TableCell className="max-w-[260px] truncate" title={row.originalFilename}>
                        {row.originalFilename}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {CARD_LABELS[row.cardType]}
                      </TableCell>
                      <TableCell className="text-muted-foreground uppercase">
                        {row.fileFormat}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.transactionCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCurrency(row.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <CategorizationBadges stats={row.uploadStats} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Delete upload ${row.originalFilename}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent className={cn(mobileDialogContentClass, "sm:max-w-lg")}>
          <DialogHeader>
            <DialogTitle>Delete this upload?</DialogTitle>
            <DialogDescription className={mobileDialogDescriptionClass}>
              {pendingDelete
                ? `This will remove "${pendingDelete.originalFilename}" and its ${pendingDelete.transactionCount} transactions. Category overrides will be kept.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={mobileDialogFooterClass}>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
