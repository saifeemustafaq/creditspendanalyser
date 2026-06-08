"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardBadge } from "@/components/card-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_LABELS, CATEGORIES, type CardType } from "@/types";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { Download } from "lucide-react";
import { MobileFilterBar } from "@/components/mobile-filter-bar";
import { TableScrollRegion } from "@/components/table-scroll-region";

interface Statement {
  _id: string;
  cardType: CardType;
  originalFilename: string;
  fileFormat: string;
  statementDate: string | null;
  uploadedAt: string;
  transactionCount: number;
  totalAmount: number;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const cardType = searchParams.get("cardType") ?? "all";
  const category = searchParams.get("category") ?? "all";

  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [isExporting, setIsExporting] = useState<"csv" | "pdf" | null>(null);

  function updateFilter(key: string, value: string) {
    const sp = new URLSearchParams(searchParams.toString());
    if (value === "" || value === "all") {
      sp.delete(key);
    } else {
      sp.set(key, value);
    }
    const query = sp.toString();
    router.replace(query ? `?${query}` : "?");
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/statements");
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load statements" }));
          if (!cancelled) {
            toast.error(body.error ?? "Failed to load statements");
            setStatements([]);
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) setStatements(data.rows ?? []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load statements");
          setStatements([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function buildExportUrl(format: "csv" | "pdf"): string {
    const sp = new URLSearchParams();
    sp.set("format", format);
    if (startDate) sp.set("startDate", startDate);
    if (endDate) sp.set("endDate", endDate);
    if (cardType !== "all") sp.set("cardType", cardType);
    if (category !== "all") sp.set("category", category);
    return `/api/export?${sp.toString()}`;
  }

  const handleExport = useCallback(
    async (format: "csv" | "pdf") => {
      setIsExporting(format);
      try {
        const res = await fetch(buildExportUrl(format));
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Export failed" }));
          toast.error(body.error ?? "Export failed");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `transactions-${Date.now()}.${format}`;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      } finally {
        setIsExporting(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDate, endDate, cardType, category],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Reports</h2>
        <p className="text-sm text-muted-foreground">
          Build a filtered export of your transactions or review uploaded statements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Filter, then download as CSV or PDF.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MobileFilterBar
            activeCount={
              (startDate ? 1 : 0) +
              (endDate ? 1 : 0) +
              (cardType !== "all" ? 1 : 0) +
              (category !== "all" ? 1 : 0)
            }
            quickChips={
              startDate || endDate ? (
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {startDate || "…"} – {endDate || "…"}
                </span>
              ) : null
            }
            desktopClassName="grid w-full gap-4 md:grid-cols-2 lg:grid-cols-4"
            renderFilters={() => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start">Start date</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => updateFilter("startDate", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">End date</Label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    onChange={(e) => updateFilter("endDate", e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Card</Label>
                  <Select
                    value={cardType}
                    onValueChange={(v) => updateFilter("cardType", v ?? "all")}
                  >
                    <SelectTrigger className="w-full">
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
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => updateFilter("category", v ?? "all")}
                  >
                    <SelectTrigger className="w-full">
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
                </div>
              </>
            )}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => handleExport("csv")} disabled={isExporting !== null} className="w-full sm:w-auto">
              <Download />
              {isExporting === "csv" ? "Exporting…" : "Export CSV"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport("pdf")}
              disabled={isExporting !== null}
              className="w-full sm:w-auto"
            >
              <Download />
              {isExporting === "pdf" ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statement history</CardTitle>
          <CardDescription>Every uploaded statement.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TableScrollRegion>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead className="hidden sm:table-cell">Card</TableHead>
                  <TableHead className="hidden lg:table-cell">Statement date</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements === null ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : statements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No statements uploaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  statements.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell className="hidden md:table-cell">{fmtDate(s.uploadedAt)}</TableCell>
                      <TableCell className="max-w-[200px] font-medium md:max-w-none">
                        <span className="line-clamp-2 md:line-clamp-none">{s.originalFilename}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                          <CardBadge cardType={s.cardType} />
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <CardBadge cardType={s.cardType} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{fmtDate(s.statementDate)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums">
                        {s.transactionCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCurrency(s.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableScrollRegion>
        </CardContent>
      </Card>
    </div>
  );
}
