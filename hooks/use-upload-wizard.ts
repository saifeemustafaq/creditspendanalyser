import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AI_CATEGORIZE_BATCH_SIZE, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { fmtCurrency } from "@/lib/format";
import { CATEGORIES, type CardType, type Category, type FileFormat } from "@/types";
import { normalizeMerchantKey } from "@/lib/services/merchant-normalizer";
import type { AISummary } from "@/components/upload-review-table";
import type { PreviewTransaction } from "@/lib/services/extraction-pipeline";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DuplicateSummary = {
  existing: number;
  inFile: number;
  newCount: number;
};

export type PreviewState = {
  originalFilename: string;
  cardType: CardType;
  fileFormat: FileFormat;
  statementDate: string | null;
  transactions: PreviewTransaction[];
  duplicateSummary: DuplicateSummary;
};

export type ConfirmResult = {
  statementId: string | null;
  transactionCount: number;
  totalAmount: number;
  cardType: CardType;
  statementDate: string | null;
  rowsSkippedDuplicate: number;
  rowsSkippedInFile: number;
  allDuplicates: boolean;
};

export type UploadStep = "upload" | "review" | "done";

// ─── Response parsers ─────────────────────────────────────────────────────────

type AICategorizeResultRow = { index: number; category: Category };

function parseAICategorizeResults(value: unknown): AICategorizeResultRow[] {
  if (!value || typeof value !== "object") return [];
  const results = (value as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const out: AICategorizeResultRow[] = [];
  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.index !== "number") continue;
    if (typeof row.category !== "string") continue;
    if (!(CATEGORIES as readonly string[]).includes(row.category)) continue;
    out.push({ index: row.index, category: row.category as Category });
  }
  return out;
}

function parseDuplicateSummary(value: unknown): DuplicateSummary {
  if (!value || typeof value !== "object") return { existing: 0, inFile: 0, newCount: 0 };
  const o = value as Record<string, unknown>;
  return {
    existing: typeof o.existing === "number" ? o.existing : 0,
    inFile: typeof o.inFile === "number" ? o.inFile : 0,
    newCount: typeof o.newCount === "number" ? o.newCount : 0,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type UseUploadWizardReturn = {
  step: UploadStep;
  busy: boolean;
  aiBusy: boolean;
  saving: boolean;
  dragOver: boolean;
  preview: PreviewState | null;
  result: ConfirmResult | null;
  aiSummary: AISummary | null;
  uncategorizedCount: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setDragOver: (v: boolean) => void;
  handleFiles: (files: FileList | null) => Promise<void>;
  changeCategory: (index: number, category: Category) => void;
  runAICategorization: () => Promise<void>;
  saveTransactions: () => Promise<void>;
  startOver: () => void;
  confirmSuccessMessage: string;
};

export function useUploadWizard(): UseUploadWizardReturn {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>("upload");
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
      (t) => !t.isDuplicate && t.category === "Other" && t.type === "debit",
    ).length;
  }, [preview]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`);
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
      if (i === index) return { ...tx, category, categorizedBy: "user" as const };
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
      toast.success(`Updated ${propagatedCount + 1} transactions for ${target.merchant}`);
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
      const bumpCatCount = (cat: Category) => catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);

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
        for (const r of validated) {
          const target = indexes[r.index];
          if (target === undefined) continue;
          next[target] = { ...next[target], category: r.category, categorizedBy: "ai" };
        }
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
      const topCategories = [...catCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }));

      setAiSummary({ sent: ambiguousIndexes.length, categorized: totalResolved, topCategories });
      toast.success(`AI categorized ${totalResolved} of ${ambiguousIndexes.length} transactions`);
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
      const saved: ConfirmResult = {
        statementId: data.statementId ?? null,
        transactionCount: data.transactionCount ?? 0,
        totalAmount: data.totalAmount ?? 0,
        cardType: preview.cardType,
        statementDate: preview.statementDate,
        rowsSkippedDuplicate: data.rowsSkippedDuplicate ?? 0,
        rowsSkippedInFile: data.rowsSkippedInFile ?? 0,
        allDuplicates: Boolean(data.allDuplicates),
      };
      setResult(saved);
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

  const confirmSuccessMessage = result
    ? result.allDuplicates
      ? "Every transaction in this file is already in your database."
      : `Saved ${result.transactionCount} transactions · ${fmtCurrency(result.totalAmount)} total spend`
    : "";

  return {
    step,
    busy,
    aiBusy,
    saving,
    dragOver,
    preview,
    result,
    aiSummary,
    uncategorizedCount,
    inputRef,
    setDragOver,
    handleFiles,
    changeCategory,
    runAICategorization,
    saveTransactions,
    startOver,
    confirmSuccessMessage,
  };
}
