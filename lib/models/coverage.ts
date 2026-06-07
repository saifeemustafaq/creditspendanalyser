import { ObjectId } from "mongodb";
import { getCardSettingsForUser } from "@/lib/models/card-settings";
import { COLLECTIONS, getDb } from "@/lib/db";
import { CARD_LABELS } from "@/types";
import type { CardType, TransactionDoc } from "@/types";

export type CoveredRange = { start: Date; end: Date };

export type CardCoverageResult = {
  cardType: CardType;
  /** Sorted, non-overlapping date ranges derived from uploaded statements. */
  coveredRanges: CoveredRange[];
  /** User-defined card open date; dates before this are not flagged missing. */
  startDate: Date | null;
};

/** Merge overlapping or adjacent date ranges (within one day of each other). */
function mergeRanges(ranges: CoveredRange[]): CoveredRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: CoveredRange[] = [{ start: sorted[0].start, end: sorted[0].end }];
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

type AggRow = {
  _id: { statementId: ObjectId; cardType: CardType };
  minDate: Date;
  maxDate: Date;
};

/**
 * Returns coverage for cards the user has uploads for or has explicitly tracked
 * (via a configured start date). Generic fallback types with no data are omitted.
 */
export async function getCoverageForUser(userId: string): Promise<CardCoverageResult[]> {
  const db = await getDb();

  const [rows, settings] = await Promise.all([
    db
      .collection<TransactionDoc>(COLLECTIONS.transactions)
      .aggregate<AggRow>([
        { $match: { userId: new ObjectId(userId) } },
        {
          $group: {
            _id: { statementId: "$statementId", cardType: "$cardType" },
            minDate: { $min: "$transactionDate" },
            maxDate: { $max: "$transactionDate" },
          },
        },
      ])
      .toArray(),
    getCardSettingsForUser(userId),
  ]);

  const rangesByCard = new Map<CardType, CoveredRange[]>();
  for (const row of rows) {
    const card = row._id.cardType;
    const list = rangesByCard.get(card) ?? [];
    list.push({ start: row.minDate, end: row.maxDate });
    rangesByCard.set(card, list);
  }

  const startDateByCard = new Map<CardType, Date | null>();
  for (const s of settings) {
    startDateByCard.set(s.cardType, s.startDate ?? null);
  }

  const visibleCards = new Set<CardType>();
  for (const card of rangesByCard.keys()) visibleCards.add(card);
  for (const card of startDateByCard.keys()) visibleCards.add(card);

  return [...visibleCards]
    .sort((a, b) => CARD_LABELS[a].localeCompare(CARD_LABELS[b]))
    .map((cardType) => ({
      cardType,
      coveredRanges: mergeRanges(rangesByCard.get(cardType) ?? []),
      startDate: startDateByCard.has(cardType)
        ? (startDateByCard.get(cardType) ?? null)
        : null,
    }));
}

type MinDateRow = { _id: null; minDate: Date };

/** Earliest transaction year through the current year (for the year switcher). */
export async function getCoverageYearRange(
  userId: string,
): Promise<{ minYear: number; maxYear: number }> {
  const db = await getDb();
  const now = new Date();
  const maxYear = now.getUTCFullYear();

  const rows = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .aggregate<MinDateRow>([
      { $match: { userId: new ObjectId(userId) } },
      { $group: { _id: null, minDate: { $min: "$transactionDate" } } },
    ])
    .toArray();

  const minYear = rows[0]?.minDate
    ? new Date(rows[0].minDate).getUTCFullYear()
    : maxYear;

  return { minYear, maxYear };
}
