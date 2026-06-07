"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CARD_COLORS } from "@/lib/constants";
import { fmtDateOnly } from "@/lib/format";
import { calendarTodayUtc, parseDateOnly } from "@/lib/range";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CardType } from "@/types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export type CoveredRangeStr = { start: string; end: string };

type DateRange = { start: Date; end: Date };

type MonthSegment = DateRange & { type: "covered" | "uncovered"; fraction: number };

function toUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function fmtRangeLabel(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) return fmtDateOnly(start);
  return `${fmtDateOnly(start)} – ${fmtDateOnly(end)}`;
}

function parseCoveredRanges(ranges: CoveredRangeStr[]): DateRange[] {
  return ranges.map((r) => ({
    start: parseDateOnly(r.start) ?? toUtcDay(new Date(r.start)),
    end: parseDateOnly(r.end) ?? toUtcDay(new Date(r.end)),
  }));
}

/** Merge overlapping or adjacent date ranges. */
function mergeRanges(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: DateRange[] = [{ start: sorted[0].start, end: sorted[0].end }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.start.getTime() <= last.end.getTime() + 86_400_000) {
      if (curr.end.getTime() > last.end.getTime()) last.end = curr.end;
    } else {
      merged.push({ start: curr.start, end: curr.end });
    }
  }
  return merged;
}

export function resolveCoverageWindow(
  selectedYear: number,
  cardStartDate?: string | null,
  today: Date = calendarTodayUtc(),
): { windowStart: Date; windowEnd: Date } | null {
  const todayUtc = toUtcDay(today);
  const currentYear = todayUtc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(selectedYear, 0, 1));
  const yearEnd =
    selectedYear === currentYear ? todayUtc : new Date(Date.UTC(selectedYear, 11, 31));

  let windowStart = yearStart;
  if (cardStartDate) {
    const cardStart = parseDateOnly(cardStartDate);
    if (cardStart && cardStart.getTime() > windowStart.getTime()) {
      windowStart = cardStart;
    }
  }

  if (windowStart.getTime() > yearEnd.getTime()) return null;

  return { windowStart, windowEnd: yearEnd };
}

/**
 * Missing date ranges within the selected year's window not covered by uploads.
 */
export function computeMissingRanges(
  coveredRanges: CoveredRangeStr[],
  selectedYear: number,
  cardStartDate?: string | null,
  today: Date = calendarTodayUtc(),
): DateRange[] {
  const window = resolveCoverageWindow(selectedYear, cardStartDate, today);
  if (!window) return [];

  const { windowStart, windowEnd } = window;
  const merged = mergeRanges(parseCoveredRanges(coveredRanges));

  if (merged.length === 0) {
    return [{ start: windowStart, end: windowEnd }];
  }

  const missing: DateRange[] = [];
  let cursor = windowStart;

  for (const range of merged) {
    if (range.start.getTime() > cursor.getTime()) {
      missing.push({
        start: cursor,
        end: new Date(range.start.getTime() - 86_400_000),
      });
    }
    const next = new Date(range.end.getTime() + 86_400_000);
    if (next.getTime() > cursor.getTime()) cursor = next;
  }

  if (cursor.getTime() <= windowEnd.getTime()) {
    missing.push({ start: cursor, end: windowEnd });
  }

  return missing;
}

function computeMonthSegments(
  year: number,
  month: number,
  coveredRanges: CoveredRangeStr[],
  today: Date,
  windowStart: Date,
  windowEnd: Date,
): MonthSegment[] {
  const monthStart = new Date(Date.UTC(year, month, 1));
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));
  const todayUtc = toUtcDay(today);

  const isCurrentMonth =
    year === todayUtc.getUTCFullYear() && month === todayUtc.getUTCMonth();
  const monthEnd =
    isCurrentMonth && todayUtc.getTime() < lastDayOfMonth.getTime()
      ? todayUtc
      : lastDayOfMonth;

  const effectiveStart =
    windowStart.getTime() > monthStart.getTime() ? windowStart : monthStart;
  const effectiveEnd =
    windowEnd.getTime() < monthEnd.getTime() ? windowEnd : monthEnd;

  if (effectiveStart.getTime() > effectiveEnd.getTime()) return [];

  const totalDays = daysBetween(effectiveStart, effectiveEnd) + 1;

  const clipped: DateRange[] = [];
  for (const r of coveredRanges) {
    const rStart = parseDateOnly(r.start) ?? toUtcDay(new Date(r.start));
    const rEnd = parseDateOnly(r.end) ?? toUtcDay(new Date(r.end));
    const clipStart =
      rStart.getTime() < effectiveStart.getTime() ? effectiveStart : rStart;
    const clipEnd = rEnd.getTime() > effectiveEnd.getTime() ? effectiveEnd : rEnd;
    if (clipStart.getTime() <= clipEnd.getTime()) {
      clipped.push({ start: clipStart, end: clipEnd });
    }
  }

  if (clipped.length === 0) {
    return [
      { type: "uncovered", start: effectiveStart, end: effectiveEnd, fraction: 1 },
    ];
  }

  clipped.sort((a, b) => a.start.getTime() - b.start.getTime());

  const segments: MonthSegment[] = [];
  let cursor = effectiveStart;

  for (const range of clipped) {
    if (range.start.getTime() > cursor.getTime()) {
      const gapEnd = new Date(range.start.getTime() - 86_400_000);
      const gapDays = daysBetween(cursor, gapEnd) + 1;
      segments.push({
        type: "uncovered",
        start: cursor,
        end: gapEnd,
        fraction: gapDays / totalDays,
      });
    }
    const coveredDays = daysBetween(range.start, range.end) + 1;
    segments.push({
      type: "covered",
      start: range.start,
      end: range.end,
      fraction: coveredDays / totalDays,
    });
    cursor = new Date(range.end.getTime() + 86_400_000);
  }

  if (cursor.getTime() <= effectiveEnd.getTime()) {
    const remainingDays = daysBetween(cursor, effectiveEnd) + 1;
    segments.push({
      type: "uncovered",
      start: cursor,
      end: effectiveEnd,
      fraction: remainingDays / totalDays,
    });
  }

  return segments;
}

type Props = {
  cardType: CardType;
  coveredRanges: CoveredRangeStr[];
  cardStartDate?: string | null;
  selectedYear: number;
};

export function CoverageTimeline({
  cardType,
  coveredRanges,
  cardStartDate,
  selectedYear,
}: Props) {
  const color = CARD_COLORS[cardType];
  const todayUtc = calendarTodayUtc();
  const currentMonth = todayUtc.getUTCMonth();
  const currentYear = todayUtc.getUTCFullYear();
  const isCurrentYear = selectedYear === currentYear;

  const coverageWindow = useMemo(
    () => resolveCoverageWindow(selectedYear, cardStartDate, todayUtc),
    [selectedYear, cardStartDate, todayUtc],
  );

  const months = useMemo(() => {
    if (!coverageWindow) return [];

    const result: { year: number; month: number; label: string }[] = [];
    const { windowStart } = coverageWindow;
    const firstMonth =
      windowStart.getUTCFullYear() === selectedYear ? windowStart.getUTCMonth() : 0;
    const lastMonth = isCurrentYear ? currentMonth : 11;

    for (let m = firstMonth; m <= lastMonth; m++) {
      result.push({ year: selectedYear, month: m, label: MONTH_NAMES[m] });
    }
    return result;
  }, [coverageWindow, selectedYear, isCurrentYear, currentMonth]);

  const monthData = useMemo(
    () =>
      months.map((m) => ({
        ...m,
        segments: computeMonthSegments(
          m.year,
          m.month,
          coveredRanges,
          todayUtc,
          coverageWindow!.windowStart,
          coverageWindow!.windowEnd,
        ),
      })),
    [months, coveredRanges, todayUtc, coverageWindow],
  );

  const missingRanges = useMemo(
    () => computeMissingRanges(coveredRanges, selectedYear, cardStartDate, todayUtc),
    [coveredRanges, selectedYear, cardStartDate, todayUtc],
  );

  if (!coverageWindow) {
    return (
      <p className="text-xs text-muted-foreground">
        This card did not exist in {selectedYear}.
      </p>
    );
  }

  const totalMonths = monthData.length;

  if (totalMonths === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No coverage window for {selectedYear}.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="w-full overflow-hidden rounded border">
        <div className="flex w-full">
          {monthData.map((m, idx) => {
            const isLast = idx === totalMonths - 1;
            return (
              <div
                key={`${m.year}-${m.month}`}
                className={cn("flex min-w-0 flex-col", !isLast && "border-r")}
                style={{ width: `${(1 / totalMonths) * 100}%` }}
              >
                <div className="flex h-5 w-full overflow-hidden">
                  {m.segments.map((seg, si) => {
                    const label =
                      seg.type === "covered"
                        ? `Uploaded: ${fmtRangeLabel(seg.start, seg.end)}`
                        : `Missing: ${fmtRangeLabel(seg.start, seg.end)}`;
                    return (
                      <Tooltip key={si}>
                        <TooltipTrigger
                          render={
                            <div
                              className={cn(
                                "h-full min-w-0",
                                seg.type === "uncovered" && "cursor-help bg-muted",
                              )}
                              style={{
                                width: `${seg.fraction * 100}%`,
                                ...(seg.type === "covered" ? { backgroundColor: color } : {}),
                              }}
                            />
                          }
                        />
                        <TooltipContent className="max-w-xs text-xs leading-relaxed">
                          {label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
                <div className="py-0.5 text-center text-[9px] leading-tight text-muted-foreground">
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {missingRanges.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Missing dates</p>
          <ul className="flex flex-wrap gap-1.5">
            {missingRanges.map((range, i) => (
              <li
                key={i}
                className="rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground"
              >
                {fmtRangeLabel(range.start, range.end)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
