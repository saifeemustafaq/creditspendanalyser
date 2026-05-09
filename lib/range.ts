export type RangeKey = "1m" | "3m" | "6m" | "12m" | "all";

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
