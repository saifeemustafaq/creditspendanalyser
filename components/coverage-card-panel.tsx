"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CARD_LABELS, type CardType } from "@/types";
import { toDateInputValue } from "@/lib/format";
import { CoverageTimeline, type CoveredRangeStr } from "@/components/coverage-timeline";

export type CardCoverage = {
  cardType: CardType;
  coveredRanges: CoveredRangeStr[];
  startDate: string | null;
};

type Props = {
  entry: CardCoverage;
  selectedYear: number;
  onStartDateSaved: (cardType: CardType, startDate: string | null) => void;
};

export function CoverageCardPanel({ entry, selectedYear, onStartDateSaved }: Props) {
  const [startDate, setStartDate] = useState(toDateInputValue(entry.startDate));
  const [saving, setSaving] = useState(false);

  const hasUploads = entry.coveredRanges.length > 0;

  const saveStartDate = useCallback(
    async (value: string) => {
      setSaving(true);
      try {
        const res = await fetch("/api/coverage/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardType: entry.cardType,
            startDate: value || null,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(body.error ?? "Failed to save start date");
          setStartDate(toDateInputValue(entry.startDate));
          return;
        }
        onStartDateSaved(entry.cardType, value || null);
        toast.success(value ? "Card start date saved" : "Card start date cleared");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save start date");
        setStartDate(toDateInputValue(entry.startDate));
      } finally {
        setSaving(false);
      }
    },
    [entry.cardType, entry.startDate, onStartDateSaved],
  );

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">{CARD_LABELS[entry.cardType]}</span>
          {!hasUploads && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No uploads yet
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={`start-${entry.cardType}`} className="text-xs text-muted-foreground">
            Card opened
          </Label>
          <Input
            id={`start-${entry.cardType}`}
            type="date"
            value={startDate}
            disabled={saving}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={() => {
              const saved = toDateInputValue(entry.startDate);
              if (startDate !== saved) void saveStartDate(startDate);
            }}
            className="h-8 w-[150px] text-xs"
          />
          {startDate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              disabled={saving}
              onClick={() => {
                setStartDate("");
                void saveStartDate("");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <CoverageTimeline
        cardType={entry.cardType}
        coveredRanges={entry.coveredRanges}
        cardStartDate={startDate || entry.startDate}
        selectedYear={selectedYear}
      />
    </div>
  );
}
