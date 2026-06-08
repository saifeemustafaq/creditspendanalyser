"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUDIT_DEFAULT_SAMPLE_SIZE,
  AUDIT_SAMPLE_SIZES,
} from "@/lib/constants";
import {
  CARD_LABELS,
  CATEGORIES,
  type CardType,
  type Category,
} from "@/types";
import { AuditResultsView } from "@/components/audit-results-view";
import {
  mobileDialogContentClass,
  mobileDialogDescriptionClass,
  mobileDialogFooterClass,
} from "@/lib/mobile-dialog";
import { cn } from "@/lib/utils";
import { parseAuditResponse } from "./audit-response-parser";
import {
  SOURCE_LABELS,
  type AuditPhase,
  type AuditResponse,
  type AuditableSource,
  type Resolution,
  type ResolutionAction,
} from "./audit-types";

interface AuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  initialCardType?: CardType;
  initialCategory?: Category;
}

export function AuditDialog({
  open,
  onOpenChange,
  onComplete,
  initialCardType,
  initialCategory,
}: AuditDialogProps) {
  const [phase, setPhase] = useState<AuditPhase>("config");
  const [sampleSize, setSampleSize] = useState<number>(AUDIT_DEFAULT_SAMPLE_SIZE);
  const [sources, setSources] = useState<Set<AuditableSource>>(
    new Set(["source_map", "rule"]),
  );
  const [filterCardType, setFilterCardType] = useState<string>(initialCardType ?? "all");
  const [filterCategory, setFilterCategory] = useState<string>(initialCategory ?? "all");
  const [results, setResults] = useState<AuditResponse | null>(null);
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(new Map());
  const [matchesExpanded, setMatchesExpanded] = useState(false);

  function resetAndClose() {
    setPhase("config");
    setResults(null);
    setResolutions(new Map());
    setMatchesExpanded(false);
    setSampleSize(AUDIT_DEFAULT_SAMPLE_SIZE);
    setSources(new Set(["source_map", "rule"]));
    setFilterCardType(initialCardType ?? "all");
    setFilterCategory(initialCategory ?? "all");
    onOpenChange(false);
  }

  function toggleSource(s: AuditableSource) {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size === 1) return prev;
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  }

  async function runAudit() {
    if (sources.size === 0) {
      toast.error("Select at least one source to audit");
      return;
    }
    setPhase("loading");
    try {
      const body: Record<string, unknown> = {
        sampleSize,
        sources: Array.from(sources),
      };
      if (filterCardType !== "all") body.cardType = filterCardType;
      if (filterCategory !== "all") body.category = filterCategory;
      const res = await fetch("/api/transactions/audit/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Audit failed");
        setPhase("config");
        return;
      }
      const parsed = parseAuditResponse(json);
      if (!parsed) {
        toast.error("Audit response was malformed");
        setPhase("config");
        return;
      }
      setResults(parsed);
      setResolutions(new Map());
      setPhase("results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed");
      setPhase("config");
    }
  }

  function setResolution(id: string, resolution: Resolution) {
    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(id, resolution);
      return next;
    });
  }

  function bulkSet(action: ResolutionAction) {
    if (!results) return;
    const next = new Map(resolutions);
    for (const d of results.disagreements) {
      const existing = next.get(d._id);
      if (existing?.action === "skip") continue;
      next.set(d._id, { action });
    }
    setResolutions(next);
  }

  async function saveResults() {
    if (!results) return;
    const unresolved = results.disagreements.filter((d) => !resolutions.has(d._id));
    if (unresolved.length > 0) {
      toast.error(`${unresolved.length} disagreement${unresolved.length === 1 ? "" : "s"} unresolved`);
      return;
    }
    setPhase("saving");
    try {
      const payload = {
        resolutions: results.disagreements.map((d) => {
          const r = resolutions.get(d._id);
          return {
            transactionId: d._id,
            action: r?.action ?? "keep_current",
            aiCategory: d.aiSuggestedCategory,
            merchant: d.merchant,
            ...(r?.action === "manual" && r.manualCategory
              ? { manualCategory: r.manualCategory }
              : {}),
          };
        }),
        allTransactionIds: [
          ...results.disagreements.map((d) => d._id),
          ...results.matches.map((m) => m._id),
        ],
      };
      const res = await fetch("/api/transactions/audit/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save audit results");
        setPhase("results");
        return;
      }
      const corrected = typeof json.corrected === "number" ? json.corrected : 0;
      const confirmed = typeof json.confirmed === "number" ? json.confirmed : 0;
      const skipped = typeof json.skipped === "number" ? json.skipped : 0;
      const parts = [`${corrected} corrected`, `${confirmed} confirmed`];
      if (skipped > 0) parts.push(`${skipped} skipped`);
      toast.success(`Audit complete: ${parts.join(", ")}`);
      resetAndClose();
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save audit results");
      setPhase("results");
    }
  }

  const skippedCount = results
    ? results.disagreements.filter((d) => resolutions.get(d._id)?.action === "skip").length
    : 0;
  const resolvedCount = results
    ? results.disagreements.filter((d) => {
        const r = resolutions.get(d._id);
        return r && r.action !== "skip";
      }).length
    : 0;
  const totalDisagreements = results?.disagreements.length ?? 0;
  const activeDisagreements = totalDisagreements - skippedCount;
  const allResolved = totalDisagreements > 0 && resolvedCount + skippedCount === totalDisagreements;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (phase === "loading" || phase === "saving") return;
        if (!next) {
          resetAndClose();
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent className={cn(mobileDialogContentClass, "sm:max-w-3xl")}>
        {phase === "config" && (
          <>
            <DialogHeader>
              <DialogTitle>Audit Categories</DialogTitle>
              <DialogDescription className={mobileDialogDescriptionClass}>
                Picks a random sample of transactions and cross-checks their categories with AI.
                Prioritizes transactions that haven&apos;t been audited before.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sample size</label>
                <Select
                  value={String(sampleSize)}
                  onValueChange={(v) => setSampleSize(Number(v))}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_SAMPLE_SIZES.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} transactions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sources to audit</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SOURCE_LABELS) as AuditableSource[]).map((s) => {
                    const active = sources.has(s);
                    return (
                      <Button
                        key={s}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        onClick={() => toggleSource(s)}
                      >
                        {SOURCE_LABELS[s]}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Card type (optional)</label>
                  <Select
                    value={filterCardType}
                    onValueChange={(v) => setFilterCardType(v ?? "all")}
                  >
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
                  <label className="text-sm font-medium">Category (optional)</label>
                  <Select
                    value={filterCategory}
                    onValueChange={(v) => setFilterCategory(v ?? "all")}
                  >
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
            </div>
            <DialogFooter className={mobileDialogFooterClass}>
              <Button variant="outline" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button onClick={runAudit}>Run Audit</Button>
            </DialogFooter>
          </>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sampling and cross-checking with AI…
            </p>
          </div>
        )}

        {phase === "results" && results && (
          <AuditResultsView
            results={results}
            resolutions={resolutions}
            resolvedCount={resolvedCount}
            activeDisagreements={activeDisagreements}
            allResolved={allResolved}
            matchesExpanded={matchesExpanded}
            onToggleMatches={() => setMatchesExpanded((v) => !v)}
            onResolveRow={setResolution}
            onBulkSet={bulkSet}
            onCancel={resetAndClose}
            onSave={saveResults}
            saving={false}
          />
        )}

        {phase === "saving" && results && (
          <AuditResultsView
            results={results}
            resolutions={resolutions}
            resolvedCount={resolvedCount}
            activeDisagreements={activeDisagreements}
            allResolved={allResolved}
            matchesExpanded={matchesExpanded}
            onToggleMatches={() => setMatchesExpanded((v) => !v)}
            onResolveRow={setResolution}
            onBulkSet={bulkSet}
            onCancel={resetAndClose}
            onSave={saveResults}
            saving={true}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
