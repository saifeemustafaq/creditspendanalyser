"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CARD_COLORS } from "@/lib/constants";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { Download } from "lucide-react";

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
  const [statements, setStatements] = useState<Statement[] | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cardType, setCardType] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

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

  function exportUrl(format: "csv" | "pdf"): string {
    const sp = new URLSearchParams();
    sp.set("format", format);
    if (startDate) sp.set("startDate", startDate);
    if (endDate) sp.set("endDate", endDate);
    if (cardType !== "all") sp.set("cardType", cardType);
    if (category !== "all") sp.set("category", category);
    return `/api/export?${sp.toString()}`;
  }

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="start">Start date</Label>
              <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End date</Label>
              <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Card</Label>
              <Select value={cardType} onValueChange={(v) => setCardType(v ?? "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cards</SelectItem>
                  {Object.entries(CARD_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <a href={exportUrl("csv")} download className={buttonVariants()}>
              <Download /> Export CSV
            </a>
            <a
              href={exportUrl("pdf")}
              download
              className={buttonVariants({ variant: "secondary" })}
            >
              <Download /> Export PDF
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statement history</CardTitle>
          <CardDescription>Every uploaded statement.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Uploaded</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Statement date</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
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
                    <TableCell>{fmtDate(s.uploadedAt)}</TableCell>
                    <TableCell className="font-medium">{s.originalFilename}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="border-transparent"
                        style={{
                          backgroundColor: `${CARD_COLORS[s.cardType]}1A`,
                          color: CARD_COLORS[s.cardType],
                        }}
                      >
                        {CARD_LABELS[s.cardType]}
                      </Badge>
                    </TableCell>
                    <TableCell>{fmtDate(s.statementDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.transactionCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtCurrency(s.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
