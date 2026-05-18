import { ObjectId } from "mongodb";
import { COLLECTIONS, getDb } from "@/lib/db";
import { FREQUENCY_WINDOWS } from "@/lib/constants";
import {
  detectRecurring,
  generateAlerts,
  type AlertSource,
  type MerchantGroup,
} from "@/lib/services/recurring-detector";
import type {
  Category,
  RecurringFrequency,
  RecurringItem,
  RecurringOverrideAction,
  RecurringOverrideDoc,
  RecurringSummary,
  TransactionDoc,
  TransactionType,
} from "@/types";

interface GroupedTxnRow {
  _id: { merchant: string; type: TransactionType };
  points: Array<{ date: Date; amount: number; category: Category }>;
}

async function fetchMerchantGroups(userId: string): Promise<MerchantGroup[]> {
  const db = await getDb();
  const rows = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .aggregate<GroupedTxnRow>([
      { $match: { userId: new ObjectId(userId) } },
      {
        $group: {
          _id: { merchant: "$merchant", type: "$type" },
          points: {
            $push: {
              date: "$transactionDate",
              amount: "$amount",
              category: "$category",
            },
          },
        },
      },
    ])
    .toArray();

  return rows.map((r) => ({
    merchant: r._id.merchant,
    type: r._id.type,
    points: r.points,
  }));
}

export async function getRecurringOverrides(
  userId: string,
): Promise<RecurringOverrideDoc[]> {
  const db = await getDb();
  return db
    .collection<RecurringOverrideDoc>(COLLECTIONS.recurringOverrides)
    .find({ userId: new ObjectId(userId) })
    .toArray();
}

export interface UpsertOverrideArgs {
  userId: string;
  merchant: string;
  type: TransactionType;
  action: RecurringOverrideAction;
  frequency?: RecurringFrequency;
  customNote?: string;
}

export async function upsertRecurringOverride(args: UpsertOverrideArgs): Promise<void> {
  const db = await getDb();
  const userObjectId = new ObjectId(args.userId);
  await db.collection<RecurringOverrideDoc>(COLLECTIONS.recurringOverrides).updateOne(
    { userId: userObjectId, merchant: args.merchant, type: args.type },
    {
      $set: {
        action: args.action,
        ...(args.frequency ? { frequency: args.frequency } : {}),
        ...(args.customNote ? { customNote: args.customNote } : {}),
      },
      $setOnInsert: {
        userId: userObjectId,
        merchant: args.merchant,
        type: args.type,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function deleteRecurringOverride(
  userId: string,
  merchant: string,
  type: TransactionType,
): Promise<boolean> {
  const db = await getDb();
  const res = await db
    .collection<RecurringOverrideDoc>(COLLECTIONS.recurringOverrides)
    .deleteOne({
      userId: new ObjectId(userId),
      merchant,
      type,
    });
  return (res.deletedCount ?? 0) > 0;
}

export async function merchantExistsForUser(
  userId: string,
  merchant: string,
  type: TransactionType,
): Promise<boolean> {
  const db = await getDb();
  const hit = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .findOne({ userId: new ObjectId(userId), merchant, type }, { projection: { _id: 1 } });
  return hit !== null;
}

// "include"-action overrides are persisted but not synthesized into items
// here — without ≥2 occurrences we can't compute a meaningful interval or
// amount. The override stays on disk and the detector will pick the merchant
// up automatically once enough history exists.
function applyOverrides(
  items: RecurringItem[],
  overrides: RecurringOverrideDoc[],
): RecurringItem[] {
  const byKey = new Map<string, RecurringOverrideDoc>();
  for (const o of overrides) byKey.set(`${o.merchant}::${o.type}`, o);

  const result: RecurringItem[] = [];
  for (const item of items) {
    const ov = byKey.get(`${item.merchant}::${item.type}`);
    if (!ov) {
      result.push(item);
      continue;
    }
    if (ov.action === "dismiss") continue;
    if (ov.action === "frequency_override" && ov.frequency) {
      const multiplier = FREQUENCY_WINDOWS[ov.frequency].multiplier;
      result.push({
        ...item,
        frequency: ov.frequency,
        totalAnnualCost: item.averageAmount * multiplier,
        userOverride: ov.action,
      });
      continue;
    }
    result.push({ ...item, userOverride: ov.action });
  }
  return result;
}

export async function detectRecurringTransactions(
  userId: string,
): Promise<RecurringSummary> {
  const [groups, overrides] = await Promise.all([
    fetchMerchantGroups(userId),
    getRecurringOverrides(userId),
  ]);

  const now = new Date();
  const detected = detectRecurring({ groups, now });

  // Need each item's cluster amounts to feed alert generation. Re-cluster
  // by reading back the points used for the matching item (merchant+type+
  // first/last date window).
  const sources: AlertSource[] = detected.map((item) => {
    const group = groups.find(
      (g) => g.merchant === item.merchant && g.type === item.type,
    );
    if (!group) return { item, amounts: [] };
    const first = new Date(item.firstSeen).getTime();
    const last = new Date(item.lastSeen).getTime();
    const amounts = group.points
      .filter((p) => {
        const t = p.date.getTime();
        return t >= first && t <= last;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((p) => p.amount);
    return { item, amounts };
  });

  const merged = applyOverrides(detected, overrides);
  const alerts = generateAlerts(
    sources.filter((s) => merged.some((i) => i.merchant === s.item.merchant && i.type === s.item.type)),
    now,
  );

  const activeItems = merged.filter((i) => i.status === "active" && i.type === "debit");
  const totalMonthlyRecurring = activeItems.reduce(
    (sum, i) => sum + i.totalAnnualCost / 12,
    0,
  );
  const totalAnnualRecurring = activeItems.reduce((sum, i) => sum + i.totalAnnualCost, 0);

  return {
    totalMonthlyRecurring,
    totalAnnualRecurring,
    activeCount: merged.filter((i) => i.status === "active").length,
    alerts,
    items: merged,
  };
}
