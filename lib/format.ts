import { parseDateOnly } from "@/lib/range";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function fmtCurrency(n: number): string {
  return currency.format(n);
}

export function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Format a calendar date (UTC components) — use for date-only fields like coverage ranges. */
export function fmtDateOnly(d: Date | string | null): string {
  if (!d) return "—";
  const date =
    typeof d === "string" ? (parseDateOnly(d) ?? new Date(d)) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Extract YYYY-MM-DD for `<input type="date">` without timezone shift. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

export function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(undefined, { year: "2-digit", month: "short" });
}
