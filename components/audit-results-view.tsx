"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Pencil, SkipForward, X } from "lucide-react";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { CARD_LABELS, CATEGORIES, type Category } from "@/types";
import type { AuditResponse, Resolution, ResolutionAction } from "./audit-types";

interface AuditResultsViewProps {
  results: AuditResponse;
  resolutions: Map<string, Resolution>;
  resolvedCount: number;
  activeDisagreements: number;
  allResolved: boolean;
  matchesExpanded: boolean;
  onToggleMatches: () => void;
  onResolveRow: (id: string, resolution: Resolution) => void;
  onBulkSet: (action: ResolutionAction) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}

export function AuditResultsView({
  results,
  resolutions,
  resolvedCount,
  activeDisagreements,
  allResolved,
  matchesExpanded,
  onToggleMatches,
  onResolveRow,
  onBulkSet,
  onCancel,
  onSave,
  saving,
}: AuditResultsViewProps) {
  const { summary, disagreements, matches } = results;
  const [manualOpenId, setManualOpenId] = useState<string | null>(null);

  if (summary.sampled === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>No transactions to audit</DialogTitle>
          <DialogDescription>
            All transactions in scope are already categorized by AI, manual selection, or saved
            overrides. Try a wider scope or run an audit later after new uploads.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onCancel}>Close</Button>
        </DialogFooter>
      </>
    );
  }

  if (disagreements.length === 0) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Audit complete · all clear</DialogTitle>
          <DialogDescription>
            All {summary.sampled} sampled transactions match AI expectations. Your rules and
            issuer mappings look accurate.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Mark sample as audited"}
          </Button>
        </DialogFooter>
      </>
    );
  }

  const skippedCount = disagreements.length - activeDisagreements;

  function handleManualSelect(id: string, category: Category) {
    onResolveRow(id, { action: "manual", manualCategory: category });
    setManualOpenId(null);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Audit results</DialogTitle>
        <DialogDescription>
          Sampled {summary.sampled} · {summary.matches} matches ({summary.accuracyPct}%) ·{" "}
          {summary.disagreements} disagreements
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center justify-between gap-2 py-2">
        <p className="text-sm text-muted-foreground">
          {resolvedCount} of {activeDisagreements} resolved
          {skippedCount > 0 && ` · ${skippedCount} skipped`}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onBulkSet("accept_ai")}>
            Accept all AI
          </Button>
          <Button size="sm" variant="outline" onClick={() => onBulkSet("keep_current")}>
            Keep all current
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {disagreements.map((d) => {
          const resolution = resolutions.get(d._id);
          const action = resolution?.action;
          const isSkipped = action === "skip";
          const isManual = action === "manual";
          const showManualPicker = manualOpenId === d._id;

          return (
            <div
              key={d._id}
              className={cn(
                "rounded-md border p-3 transition-opacity",
                action === "accept_ai" && "border-primary/40 bg-primary/5",
                action === "keep_current" && "opacity-60",
                isManual && "border-blue-500/40 bg-blue-500/5",
                isSkipped && "opacity-40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{fmtDate(d.transactionDate)}</span>
                    <span>·</span>
                    <span>{CARD_LABELS[d.cardType]}</span>
                    <span>·</span>
                    <span className="tabular-nums">{fmtCurrency(d.amount)}</span>
                  </div>
                  <div className="truncate text-sm font-medium">{d.merchant}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">{d.currentCategory}</Badge>
                    <span className="text-muted-foreground">
                      {d.categorizedBy === "source_map" ? "Issuer" : "Rule"}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    {isManual ? (
                      <>
                        <Badge className={cn(isManual && "bg-blue-600")}>{resolution?.manualCategory}</Badge>
                        <span className="text-muted-foreground">Manual</span>
                      </>
                    ) : (
                      <>
                        <Badge>{d.aiSuggestedCategory}</Badge>
                        <span className="text-muted-foreground">AI</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant={action === "accept_ai" ? "default" : "outline"}
                    onClick={() => onResolveRow(d._id, { action: "accept_ai" })}
                    aria-label="Accept AI suggestion"
                    title="Accept AI suggestion"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={action === "keep_current" ? "default" : "outline"}
                    onClick={() => onResolveRow(d._id, { action: "keep_current" })}
                    aria-label="Keep current category"
                    title="Keep current category"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={isManual ? "default" : "outline"}
                    className={cn(isManual && "bg-blue-600 hover:bg-blue-700")}
                    onClick={() =>
                      setManualOpenId(showManualPicker ? null : d._id)
                    }
                    aria-label="Pick a different category"
                    title="Pick a different category"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={isSkipped ? "default" : "outline"}
                    className={cn(isSkipped && "bg-muted-foreground hover:bg-muted-foreground/80")}
                    onClick={() => onResolveRow(d._id, { action: "skip" })}
                    aria-label="Skip this item"
                    title="Skip — decide later"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {showManualPicker && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Override to:</span>
                  <Select
                    value={isManual ? resolution?.manualCategory : ""}
                    onValueChange={(v) => handleManualSelect(d._id, v as Category)}
                  >
                    <SelectTrigger className="h-8 w-[200px] text-xs">
                      <SelectValue placeholder="Select category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {matches.length > 0 && (
        <div className="mt-4 rounded-md border">
          <button
            type="button"
            onClick={onToggleMatches}
            className="flex w-full items-center justify-between p-3 text-sm font-medium"
          >
            <span>{matches.length} matches · categories confirmed correct</span>
            {matchesExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {matchesExpanded && (
            <div className="border-t p-3 text-xs text-muted-foreground">
              <ul className="space-y-1">
                {matches.map((m) => (
                  <li key={m._id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.merchant}</span>
                    <Badge variant="secondary">{m.category}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving || !allResolved}>
          {saving ? "Saving…" : "Save results"}
        </Button>
      </DialogFooter>
    </>
  );
}
