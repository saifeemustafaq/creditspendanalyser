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

export function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(undefined, { year: "2-digit", month: "short" });
}
