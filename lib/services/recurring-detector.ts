import {
  FREQUENCY_WINDOWS,
  RECURRING_AMOUNT_BONUS_WEIGHT,
  RECURRING_AMOUNT_TOLERANCE,
  RECURRING_BASE_SCORE_DIVISOR,
  RECURRING_CONFIDENCE_MIN,
  RECURRING_GRACE_PERIOD_MULTIPLIER,
  RECURRING_INTERVAL_BONUS_WEIGHT,
  RECURRING_INTERVAL_CV_REJECT,
  RECURRING_MIN_OCCURRENCES,
  RECURRING_PRICE_DELTA_ALERT,
  RECURRING_UNUSUAL_STDDEV_MULT,
  RECURRING_VARIABLE_THRESHOLD,
} from "@/lib/constants";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
import type {
  Category,
  RecurringAlert,
  RecurringFrequency,
  RecurringItem,
  TransactionType,
} from "@/types";

export interface RawTxnPoint {
  date: Date;
  amount: number;
  category: Category;
}

export interface MerchantGroup {
  merchant: string;
  type: TransactionType;
  points: RawTxnPoint[];
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function coefficientOfVariation(xs: number[]): number {
  const m = mean(xs);
  if (m === 0) return 1;
  return stdDev(xs) / Math.abs(m);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function classifyFrequency(medianDays: number): RecurringFrequency | null {
  for (const [freq, w] of Object.entries(FREQUENCY_WINDOWS) as Array<
    [RecurringFrequency, { min: number; max: number; multiplier: number }]
  >) {
    if (medianDays >= w.min && medianDays <= w.max) return freq;
  }
  return null;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Splits a merchant group into amount-clusters within ±RECURRING_AMOUNT_TOLERANCE
 * of a moving anchor mean. Chronologically scanned so a price change that
 * persists is treated as a single cluster's progression rather than a split.
 */
function clusterByAmount(points: RawTxnPoint[]): RawTxnPoint[][] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
  const clusters: RawTxnPoint[][] = [];

  for (const p of sorted) {
    let placed = false;
    for (const cluster of clusters) {
      const anchor = mean(cluster.map((c) => c.amount));
      if (anchor === 0) continue;
      const delta = Math.abs(p.amount - anchor) / anchor;
      if (delta <= RECURRING_AMOUNT_TOLERANCE) {
        cluster.push(p);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([p]);
  }
  return clusters;
}

interface DetectionContext {
  now: Date;
}

function detectFromCluster(
  group: MerchantGroup,
  cluster: RawTxnPoint[],
  ctx: DetectionContext,
): RecurringItem | null {
  if (cluster.length < RECURRING_MIN_OCCURRENCES) return null;

  const sorted = [...cluster].sort((a, b) => a.date.getTime() - b.date.getTime());
  const amounts = sorted.map((p) => p.amount);
  const dates = sorted.map((p) => p.date);

  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    intervals.push(daysBetween(dates[i - 1], dates[i]));
  }
  if (intervals.length === 0) return null;

  const medianInterval = median(intervals);
  const frequency = classifyFrequency(medianInterval);
  if (!frequency) return null;

  const amountMean = mean(amounts);
  const amountSd = stdDev(amounts);
  const amountCv = amountMean === 0 ? 1 : amountSd / Math.abs(amountMean);
  const intervalCv = coefficientOfVariation(intervals);

  // Grocery / lumpy filter: high amount variance AND irregular intervals.
  // Either fixed amount OR regular cadence is enough to consider it recurring.
  if (
    amountCv > RECURRING_VARIABLE_THRESHOLD &&
    intervalCv > RECURRING_INTERVAL_CV_REJECT
  )
    return null;

  const baseScore = Math.min(sorted.length / RECURRING_BASE_SCORE_DIVISOR, 0.5);
  const intervalBonus = Math.max(0, 1 - intervalCv) * RECURRING_INTERVAL_BONUS_WEIGHT;
  const amountBonus = Math.max(0, 1 - amountCv) * RECURRING_AMOUNT_BONUS_WEIGHT;
  const confidence = Math.min(1, baseScore + intervalBonus + amountBonus);
  if (confidence < RECURRING_CONFIDENCE_MIN) return null;

  const lastDate = dates[dates.length - 1];
  const nextExpectedDate = new Date(lastDate.getTime() + medianInterval * MS_PER_DAY);
  const elapsedSinceLast = daysBetween(lastDate, ctx.now);

  let status: RecurringItem["status"];
  if (sorted.length === RECURRING_MIN_OCCURRENCES) {
    status = "new";
  } else if (elapsedSinceLast > medianInterval * RECURRING_GRACE_PERIOD_MULTIPLIER) {
    status = "possibly_cancelled";
  } else {
    status = "active";
  }

  const multiplier = FREQUENCY_WINDOWS[frequency].multiplier;
  const totalAnnualCost = amountMean * multiplier;
  const isVariable = amountCv > RECURRING_AMOUNT_TOLERANCE;

  // Pick the most recent category in the cluster as the item's category.
  const category = sorted[sorted.length - 1].category;

  return {
    merchant: group.merchant,
    type: group.type,
    averageAmount: amountMean,
    lastAmount: amounts[amounts.length - 1],
    frequency,
    confidence,
    transactionCount: sorted.length,
    firstSeen: toIso(dates[0]),
    lastSeen: toIso(lastDate),
    nextExpected: toIso(nextExpectedDate),
    category,
    status,
    isVariable,
    amountStdDev: amountSd,
    totalAnnualCost,
  };
}

export interface DetectArgs {
  groups: MerchantGroup[];
  now?: Date;
}

export function detectRecurring(args: DetectArgs): RecurringItem[] {
  const ctx: DetectionContext = { now: args.now ?? new Date() };
  const items: RecurringItem[] = [];
  for (const group of args.groups) {
    if (group.points.length < RECURRING_MIN_OCCURRENCES) continue;
    const clusters = clusterByAmount(group.points);
    for (const cluster of clusters) {
      const item = detectFromCluster(group, cluster, ctx);
      if (item) items.push(item);
    }
  }
  return items;
}

/**
 * Build per-item alerts by comparing the latest reading to the cluster's
 * history. Takes already-detected items plus the raw cluster points so we
 * can reference the previous charge amount and the historical mean/stddev.
 */
export interface AlertSource {
  item: RecurringItem;
  amounts: number[];
}

export function generateAlerts(
  sources: AlertSource[],
  now: Date = new Date(),
): RecurringAlert[] {
  const alerts: RecurringAlert[] = [];
  const detectedAt = now.toISOString();

  for (const { item, amounts } of sources) {
    if (amounts.length >= 2) {
      const last = amounts[amounts.length - 1];
      const prev = amounts[amounts.length - 2];
      if (prev !== 0) {
        const delta = (last - prev) / Math.abs(prev);
        if (delta >= RECURRING_PRICE_DELTA_ALERT) {
          alerts.push({
            merchant: item.merchant,
            type: "price_increase",
            severity: "warning",
            message: `Charge rose from ${prev.toFixed(2)} to ${last.toFixed(2)}.`,
            detectedAt,
          });
        } else if (delta <= -RECURRING_PRICE_DELTA_ALERT) {
          alerts.push({
            merchant: item.merchant,
            type: "price_decrease",
            severity: "info",
            message: `Charge fell from ${prev.toFixed(2)} to ${last.toFixed(2)}.`,
            detectedAt,
          });
        }
      }
    }

    if (item.status === "possibly_cancelled") {
      alerts.push({
        merchant: item.merchant,
        type: "possibly_cancelled",
        severity: "warning",
        message: `Expected charge on ${item.nextExpected ?? "—"} hasn't arrived.`,
        detectedAt,
      });
    }

    if (item.status === "new") {
      alerts.push({
        merchant: item.merchant,
        type: "new_detected",
        severity: "info",
        message: `New ${item.frequency} pattern detected.`,
        detectedAt,
      });
    }

    if (amounts.length >= 3 && item.amountStdDev > 0) {
      const last = amounts[amounts.length - 1];
      const dist = Math.abs(last - item.averageAmount);
      if (dist > RECURRING_UNUSUAL_STDDEV_MULT * item.amountStdDev) {
        alerts.push({
          merchant: item.merchant,
          type: "unusual_amount",
          severity: "warning",
          message: `Latest charge ${last.toFixed(2)} is unusually far from the typical ${item.averageAmount.toFixed(2)}.`,
          detectedAt,
        });
      }
    }
  }

  return alerts;
}
