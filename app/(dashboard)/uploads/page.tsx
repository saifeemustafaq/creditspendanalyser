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
  return (
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
        </CardContent>
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this upload?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `This will remove "${pendingDelete.originalFilename}" and its ${pendingDelete.transactionCount} transactions. Category overrides will be kept.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
