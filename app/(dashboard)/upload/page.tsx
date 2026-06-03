"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CARD_LABELS,
  CATEGORIES,
  type CardType,
  type Category,
  type FileFormat,
} from "@/types";
import { AI_CATEGORIZE_BATCH_SIZE, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileUp, Loader2 } from "lucide-react";
import { UploadReviewTable, type AISummary } from "@/components/upload-review-table";
import type { PreviewTransaction } from "@/lib/services/extraction-pipeline";
import { normalizeMerchantKey } from "@/lib/services/merchant-normalizer";

interface AICategorizeResultRow {
  index: number;
  category: Category;
}

function parseAICategorizeResults(value: unknown): AICategorizeResultRow[] {
  if (!value || typeof value !== "object") return [];
  const results = (value as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const out: AICategorizeResultRow[] = [];
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const row = item as { index?: unknown; category?: unknown };
    if (typeof row.index !== "number") continue;
    if (typeof row.category !== "string") continue;
    if (!(CATEGORIES as readonly string[]).includes(row.category)) continue;
    out.push({ index: row.index, category: row.category as Category });
  }
  return out;
}

function parseDuplicateSummary(value: unknown): DuplicateSummary {
  if (!value || typeof value !== "object") {
    return { existing: 0, inFile: 0, newCount: 0 };
  }
  const o = value as Record<string, unknown>;
  return {
    existing: typeof o.existing === "number" ? o.existing : 0,
    inFile: typeof o.inFile === "number" ? o.inFile : 0,
    newCount: typeof o.newCount === "number" ? o.newCount : 0,
  };
}

interface DuplicateSummary {
  existing: number;
  inFile: number;
  newCount: number;
}

interface PreviewState {
  originalFilename: string;
  cardType: CardType;
  fileFormat: FileFormat;
  statementDate: string | null;
  transactions: PreviewTransaction[];
  duplicateSummary: DuplicateSummary;
}

interface ConfirmResult {
  statementId: string | null;
  transactionCount: number;
  totalAmount: number;
  cardType: CardType;
  statementDate: string | null;
  rowsSkippedDuplicate: number;
  rowsSkippedInFile: number;
  allDuplicates: boolean;
}

type Step = "upload" | "review" | "done";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);

  const uncategorizedCount = useMemo(() => {
    if (!preview) return 0;
    return preview.transactions.filter(
      (t) =>
        !t.isDuplicate && t.category === "Other" && t.type === "debit",
    ).length;
  }, [preview]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("File exceeds the 20MB limit.");
      return;
    }
    setBusy(true);
    setPreview(null);
    setResult(null);
    setAiSummary(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Parse failed");
        return;
      }
      const duplicateSummary = parseDuplicateSummary(data.duplicateSummary);
      setPreview({
        originalFilename: data.originalFilename ?? file.name,
        cardType: data.cardType,
        fileFormat: data.fileFormat,
        statementDate: data.statementDate,
        transactions: data.transactions ?? [],
        duplicateSummary,
      });
      setStep("review");
      const dupMsg =
        duplicateSummary.existing + duplicateSummary.inFile > 0
          ? ` · ${duplicateSummary.newCount} new, ${duplicateSummary.existing + duplicateSummary.inFile} skipped`
          : "";
      toast.success(`Parsed ${data.transactions?.length ?? 0} transactions${dupMsg}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  }

  function changeCategory(index: number, category: Category) {
    if (!preview) return;
    const target = preview.transactions[index];
    if (!target) return;
    const targetKey = normalizeMerchantKey(target.merchant);
    let propagatedCount = 0;
    const next = preview.transactions.map((tx, i) => {
      if (i === index) {
        return { ...tx, category, categorizedBy: "user" as const };
      }
      if (
        targetKey &&
        normalizeMerchantKey(tx.merchant) === targetKey &&
        tx.category !== category
      ) {
        propagatedCount++;
        return { ...tx, category, categorizedBy: "user" as const };
      }
      return tx;
    });
    setPreview({ ...preview, transactions: next });
    if (propagatedCount > 0) {
      const total = propagatedCount + 1;
      toast.success(`Updated ${total} transactions for ${target.merchant}`);
    }
  }

  async function runAICategorization() {
    if (!preview) return;
    const ambiguousIndexes: number[] = [];
    preview.transactions.forEach((t, i) => {
      if (t.isDuplicate) return;
      if (t.category === "Other" && t.type === "debit") ambiguousIndexes.push(i);
    });
    if (ambiguousIndexes.length === 0) return;

    setAiBusy(true);
    try {
      const indexes = ambiguousIndexes.slice(0, AI_CATEGORIZE_BATCH_SIZE);
      const rows = indexes.map((i) => ({
        merchant: preview.transactions[i].merchant,
        rawDescription: preview.transactions[i].rawDescription,
      }));
      const res = await fetch("/api/upload/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "AI categorization failed");
        return;
      }
      const validated = parseAICategorizeResults(data);

      // Build a merchant→category lookup from successful AI results.
      const aiMerchantMap = new Map<string, Category>();
      for (const r of validated) {
        const target = indexes[r.index];
        if (target === undefined || r.category === "Other") continue;
        const key = normalizeMerchantKey(preview.transactions[target].merchant);
        if (key && !aiMerchantMap.has(key)) aiMerchantMap.set(key, r.category);
      }

      let categorizedCount = 0;
      let propagatedCount = 0;
      const catCounts = new Map<string, number>();

      const bumpCatCount = (cat: Category) => {
        catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
      };

      // Count direct AI hits.
      for (const r of validated) {
        if (indexes[r.index] === undefined) continue;
        if (r.category !== "Other") {
          categorizedCount++;
          bumpCatCount(r.category);
        }
      }

      setPreview((prev) => {
        if (!prev) return prev;
        const next = [...prev.transactions];

        // Pass 1: Apply direct AI results to the sent batch.
        for (const r of validated) {
          const target = indexes[r.index];
          if (target === undefined) continue;
          next[target] = {
            ...next[target],
            category: r.category,
            categorizedBy: "ai",
          };
        }

        // Pass 2: Propagate to remaining "Other" debits that share a
        // normalized merchant with a successfully categorized one.
        for (let i = 0; i < next.length; i++) {
          const tx = next[i];
          if (tx.category !== "Other" || tx.type !== "debit") continue;
          const key = normalizeMerchantKey(tx.merchant);
          if (!key) continue;
          const hit = aiMerchantMap.get(key);
          if (hit) {
            next[i] = { ...tx, category: hit, categorizedBy: "ai" };
            propagatedCount++;
            bumpCatCount(hit);
          }
        }

        return { ...prev, transactions: next };
      });

      const totalResolved = categorizedCount + propagatedCount;
      const totalNeeding = ambiguousIndexes.length;
      const topCategories = [...catCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      setAiSummary({
        sent: totalNeeding,
        categorized: totalResolved,
        topCategories,
      });

      toast.success(
        `AI categorized ${totalResolved} of ${totalNeeding} transactions`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI categorization failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function saveTransactions() {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: preview.cardType,
          fileFormat: preview.fileFormat,
          originalFilename: preview.originalFilename,
          statementDate: preview.statementDate,
          transactions: preview.transactions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Save failed");
        return;
      }
      setResult({
        statementId: data.statementId ?? null,
        transactionCount: data.transactionCount ?? 0,
        totalAmount: data.totalAmount ?? 0,
        cardType: preview.cardType,
        statementDate: preview.statementDate,
        rowsSkippedDuplicate: data.rowsSkippedDuplicate ?? 0,
        rowsSkippedInFile: data.rowsSkippedInFile ?? 0,
        allDuplicates: Boolean(data.allDuplicates),
      });
      setStep("done");
      if (data.allDuplicates) {
        toast.info("All transactions were already imported");
      } else {
        const skipped = (data.rowsSkippedDuplicate ?? 0) + (data.rowsSkippedInFile ?? 0);
        const skipMsg = skipped > 0 ? ` · skipped ${skipped} duplicates` : "";
        toast.success(`Saved ${data.transactionCount} transactions${skipMsg}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function startOver() {
    setStep("upload");
    setPreview(null);
    setResult(null);
    setAiSummary(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Upload statement
        </h2>
        <p className="text-sm text-muted-foreground">
          PDF, CSV, XLS/XLSX, or image. Review categories before saving — your
          edits become rules for next time.
        </p>
      </div>

      {/* Step 1: File Selection */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Drop a file</CardTitle>
            <CardDescription>
              Max 20 MB. CSV/XLS files parse instantly. PDFs and images take
              10-30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (busy) return;
                void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => !busy && inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-muted",
                busy && "pointer-events-none opacity-60",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm">Parsing statement...</p>
                </>
              ) : (
                <>
                  <FileUp className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click or drop file here</p>
                  <p className="text-xs text-muted-foreground">
                    PDF · CSV · XLS · JPG · PNG
                  </p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.csv,.xls,.xlsx,image/*"
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === "review" && preview && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Review transactions
                <Badge variant="secondary">
                  {CARD_LABELS[preview.cardType]}
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                {preview.duplicateSummary.newCount} new of{" "}
                {preview.transactions.length} parsed from{" "}
                {preview.originalFilename}. Edit categories for new rows before
                saving — manual changes are remembered for future uploads.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={startOver}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveTransactions}
                disabled={saving || uncategorizedCount > 0}
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save to database
              </Button>
            </div>
          </div>

          <UploadReviewTable
            rows={preview.transactions}
            onChangeCategory={changeCategory}
            onAICategorize={runAICategorization}
            aiLoading={aiBusy}
            aiSummary={aiSummary}
          />

          {/* Sticky-ish bottom save bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {uncategorizedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Resolve {uncategorizedCount} uncategorized{" "}
                {uncategorizedCount === 1 ? "transaction" : "transactions"} to
                enable save
              </p>
            )}
            <Button
              onClick={saveTransactions}
              disabled={saving || uncategorizedCount > 0}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save to database
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.allDuplicates
                ? "Nothing new to import"
                : "Statement imported"}
              <Badge variant="secondary">{CARD_LABELS[result.cardType]}</Badge>
            </CardTitle>
            <CardDescription>
              {result.allDuplicates ? (
                <>
                  Every transaction in this file is already in your database.
                  {(result.rowsSkippedDuplicate > 0 ||
                    result.rowsSkippedInFile > 0) && (
                    <>
                      {" "}
                      Skipped {result.rowsSkippedDuplicate + result.rowsSkippedInFile}{" "}
                      duplicate
                      {result.rowsSkippedDuplicate + result.rowsSkippedInFile === 1
                        ? ""
                        : "s"}
                      .
                    </>
                  )}
                </>
              ) : (
                <>
                  Saved {result.transactionCount} transactions ·{" "}
                  {fmtCurrency(result.totalAmount)} total spend
                  {(result.rowsSkippedDuplicate > 0 ||
                    result.rowsSkippedInFile > 0) && (
                    <>
                      {" "}
                      · skipped {result.rowsSkippedDuplicate + result.rowsSkippedInFile}{" "}
                      duplicates
                    </>
                  )}
                  {result.statementDate
                    ? ` · statement dated ${new Date(result.statementDate).toLocaleDateString()}`
                    : ""}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {!result.allDuplicates && (
              <Button onClick={() => router.push("/transactions")}>
                View transactions
              </Button>
            )}
            <Button variant="outline" onClick={startOver}>
              Upload another
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
