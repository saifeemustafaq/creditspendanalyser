export type RangeKey = "1m" | "3m" | "6m" | "12m" | "all" | "custom";

export const RANGE_KEYS: RangeKey[] = ["1m", "3m", "6m", "12m", "all", "custom"];

export function isRangeKey(value: string | null | undefined): value is RangeKey {
  return RANGE_KEYS.includes(value as RangeKey);
}

/** Parse a YYYY-MM-DD (or ISO prefix) as a UTC calendar date — no timezone shift. */
export function parseDateOnly(s: string): Date | undefined {
  const day = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Today's calendar date as UTC midnight (matches date-input semantics). */
export function calendarTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** Parse a nullable string into a Date, returning undefined for missing or invalid values. */
export function parseDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function rangeToDates(range: RangeKey): { startDate?: Date; endDate?: Date } {
  if (range === "all") return {};
  const now = new Date();
  const endDate = now;
  const start = new Date(now);
  if (range === "1m") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === "3m") {
    start.setMonth(start.getMonth() - 3);
  } else if (range === "6m") {
    start.setMonth(start.getMonth() - 6);
  } else if (range === "12m") {
    start.setMonth(start.getMonth() - 12);
  }
  return { startDate: start, endDate };
}
