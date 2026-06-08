"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CARD_LABELS, CARD_TYPES, type CardType } from "@/types";
import {
  CoverageCardPanel,
  type CardCoverage,
} from "@/components/coverage-card-panel";

export default function CoveragePage() {
  const [data, setData] = useState<CardCoverage[] | null>(null);
  const [minYear, setMinYear] = useState<number | null>(null);
  const [maxYear, setMaxYear] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [refreshTick, setRefreshTick] = useState(0);
  const [addCardType, setAddCardType] = useState<CardType | "">("");
  const [addStartDate, setAddStartDate] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/coverage", { signal: ctrl.signal });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: "Failed to load coverage" }));
          toast.error(body.error ?? "Failed to load coverage");
          setData([]);
          return;
        }
        const json = await res.json();
        setData(json.coverage ?? []);
        if (typeof json.minYear === "number" && typeof json.maxYear === "number") {
          setMinYear(json.minYear);
          setMaxYear(json.maxYear);
          setSelectedYear((prev) =>
            prev >= json.minYear && prev <= json.maxYear ? prev : json.maxYear,
          );
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        toast.error(err instanceof Error ? err.message : "Failed to load coverage");
        setData([]);
      }
    })();
    return () => ctrl.abort();
  }, [refreshTick]);

  const loading = data === null;

  const yearOptions = useMemo(() => {
    if (minYear === null || maxYear === null) return [];
    const years: number[] = [];
    for (let y = minYear; y <= maxYear; y++) years.push(y);
    return years;
  }, [minYear, maxYear]);

  const visibleCards = useMemo(
    () => new Set((data ?? []).map((c) => c.cardType)),
    [data],
  );

  const untrackedCards = useMemo(
    () => CARD_TYPES.filter((c) => !visibleCards.has(c)),
    [visibleCards],
  );

  const handleStartDateSaved = useCallback(
    (cardType: CardType, startDate: string | null) => {
      setData((prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex((c) => c.cardType === cardType);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], startDate };
          return next;
        }
        if (startDate) {
          return [...prev, { cardType, coveredRanges: [], startDate }].sort((a, b) =>
            CARD_LABELS[a.cardType].localeCompare(CARD_LABELS[b.cardType]),
          );
        }
        return prev;
      });
      setRefreshTick((t) => t + 1);
    },
    [],
  );

  async function trackCard() {
    if (!addCardType) {
      toast.error("Select a card to track");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/coverage/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardType: addCardType,
          track: true,
          startDate: addStartDate || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Failed to track card");
        return;
      }
      toast.success(`${CARD_LABELS[addCardType]} added to coverage`);
      setAddCardType("");
      setAddStartDate("");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to track card");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Coverage</h2>
          <p className="text-sm text-muted-foreground">
            Only cards you have uploaded statements for appear here. Set a card&apos;s open date
            to exclude earlier periods from missing-date alerts. Hover a block to see its date
            range.
          </p>
        </div>
        {!loading && yearOptions.length > 0 && (
          <div className="sticky top-0 z-10 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => v && setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-[100px]" aria-label="Year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-4">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-8 w-full rounded" />
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
            No cards yet. Upload a statement or track a card below to get started.
          </div>
        ) : (
          data.map((entry) => (
            <CoverageCardPanel
              key={entry.cardType}
              entry={entry}
              selectedYear={selectedYear}
              onStartDateSaved={handleStartDateSaved}
            />
          ))
        )}
      </div>

      {!loading && untrackedCards.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">Track another card</p>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
            <div className="w-full space-y-1.5 md:w-auto">
              <Label htmlFor="add-card" className="text-xs text-muted-foreground">
                Card
              </Label>
              <Select
                value={addCardType}
                onValueChange={(v) => setAddCardType((v as CardType) ?? "")}
              >
                <SelectTrigger id="add-card" className="w-full md:w-[240px]">
                  <SelectValue placeholder="Select a card" />
                </SelectTrigger>
                <SelectContent>
                  {untrackedCards.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CARD_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 md:w-auto">
              <Label htmlFor="add-start" className="text-xs text-muted-foreground">
                Opened on (optional)
              </Label>
              <Input
                id="add-start"
                type="date"
                value={addStartDate}
                onChange={(e) => setAddStartDate(e.target.value)}
                className="w-full md:w-[150px]"
              />
            </div>
            <Button
              onClick={trackCard}
              disabled={adding || !addCardType}
              className="w-full md:w-auto"
            >
              <Plus className="size-4" />
              Track card
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
