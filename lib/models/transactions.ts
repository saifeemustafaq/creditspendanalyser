import { ObjectId } from "mongodb";
import { COLLECTIONS, getDb } from "@/lib/db";
import type { CardType, CategorizationMethod, Category, TransactionDoc } from "@/types";



export interface InsertTransactionInput {
  statementId: ObjectId;
  userId: ObjectId;
  cardType: CardType;
  transactionDate: Date;
  postDate: Date | null;
  merchant: string;
  category: Category;
  amount: number;
  type: TransactionDoc["type"];
  rawDescription: string;
  sourceCategory?: string | null;
  categorizedBy?: CategorizationMethod;
  dedupeKey: string;
}

export async function findExistingDedupeKeys(
  userId: string,
  keys: string[],
): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const db = await getDb();
  const docs = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .find(
      { userId: new ObjectId(userId), dedupeKey: { $in: keys } },
      { projection: { dedupeKey: 1 } },
    )
    .toArray();
  const found = new Set<string>();
  for (const d of docs) {
    if (d.dedupeKey) found.add(d.dedupeKey);
  }
  return found;
}

export async function insertTransactions(rows: InsertTransactionInput[]): Promise<number> {
  if (rows.length === 0) return 0;
  const db = await getDb();
  const docs: TransactionDoc[] = rows.map((r) => ({ _id: new ObjectId(), ...r }));
  const res = await db.collection<TransactionDoc>(COLLECTIONS.transactions).insertMany(docs);
  return res.insertedCount;
}

export interface TransactionFilter {
  userId: string;
  startDate?: Date;
  endDate?: Date;
  cardType?: CardType | "all";
  category?: Category | "all";
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  statementId?: string;
}

function buildFilter(f: TransactionFilter): Record<string, unknown> {
  const q: Record<string, unknown> = { userId: new ObjectId(f.userId) };
  if (f.startDate || f.endDate) {
    const range: Record<string, Date> = {};
    if (f.startDate) range.$gte = f.startDate;
    if (f.endDate) range.$lte = f.endDate;
    q.transactionDate = range;
  }
  if (f.cardType && f.cardType !== "all") q.cardType = f.cardType;
  if (f.category && f.category !== "all") q.category = f.category;
  if (typeof f.minAmount === "number" || typeof f.maxAmount === "number") {
    const range: Record<string, number> = {};
    if (typeof f.minAmount === "number") range.$gte = f.minAmount;
    if (typeof f.maxAmount === "number") range.$lte = f.maxAmount;
    q.amount = range;
  }
  if (f.search) {
    const re = new RegExp(f.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    q.$or = [{ merchant: re }, { rawDescription: re }];
  }
  if (f.statementId && ObjectId.isValid(f.statementId)) {
    q.statementId = new ObjectId(f.statementId);
  }
  return q;
}

export type ListTransactionsResult = {
  rows: TransactionDoc[];
  total: number;
  filteredSpend: number;
  filteredDebitCount: number;
};

export async function listTransactions(
  filter: TransactionFilter,
  opts: { limit?: number; skip?: number; sort?: Record<string, 1 | -1> } = {},
): Promise<ListTransactionsResult> {
  const db = await getDb();
  const q = buildFilter(filter);
  const coll = db.collection<TransactionDoc>(COLLECTIONS.transactions);
  const [rows, total, spendAgg] = await Promise.all([
    coll
      .find(q)
      .sort(opts.sort ?? { transactionDate: -1 })
      .skip(opts.skip ?? 0)
      .limit(opts.limit ?? 50)
      .toArray(),
    coll.countDocuments(q),
    coll
      .aggregate<{ total: number; count: number }>([
        { $match: { ...q, type: "debit" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  return {
    rows,
    total,
    filteredSpend: spendAgg[0]?.total ?? 0,
    filteredDebitCount: spendAgg[0]?.count ?? 0,
  };
}

export interface CategoryInsight {
  _id: Category;
  total: number;
  count: number;
}
export interface MonthlyTrendInsight {
  _id: { y: number; m: number };
  total: number;
  count: number;
}
export interface CardInsight {
  _id: CardType;
  total: number;
  count: number;
}
export interface MerchantInsight {
  _id: string;
  total: number;
  count: number;
}
export interface SpendSummary {
  total: number;
  count: number;
  avg: number;
}
export interface TypeCount {
  _id: TransactionDoc["type"];
  count: number;
  total: number;
}
export interface InsightsResult {
  byCategory: CategoryInsight[];
  monthlyTrend: MonthlyTrendInsight[];
  byCard: CardInsight[];
  topMerchants: MerchantInsight[];
  summary: SpendSummary | null;
  typeCounts: TypeCount[];
  recent: TransactionDoc[];
}

export async function aggregateInsights(filter: TransactionFilter): Promise<InsightsResult> {
  const db = await getDb();
  const q = buildFilter(filter);
  const coll = db.collection<TransactionDoc>(COLLECTIONS.transactions);

  // Only count actual purchases toward spend totals.
  const spendMatch = { ...q, type: "debit" };

  const [byCategory, monthlyTrend, byCard, topMerchants, summary, typeCounts, recent] = await Promise.all([
    coll
      .aggregate([
        { $match: spendMatch },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ])
      .toArray(),
    coll
      .aggregate([
        { $match: spendMatch },
        {
          $group: {
            _id: {
              y: { $year: "$transactionDate" },
              m: { $month: "$transactionDate" },
            },
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ])
      .toArray(),
    coll
      .aggregate([
        { $match: spendMatch },
        { $group: { _id: "$cardType", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ])
      .toArray(),
    coll
      .aggregate([
        { $match: spendMatch },
        { $group: { _id: "$merchant", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    coll
      .aggregate([
        { $match: spendMatch },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            avg: { $avg: "$amount" },
          },
        },
      ])
      .toArray(),
    coll
      .aggregate([
        { $match: q },
        { $group: { _id: "$type", count: { $sum: 1 }, total: { $sum: "$amount" } } },
      ])
      .toArray(),
    coll.find(q).sort({ transactionDate: -1 }).limit(10).toArray(),
  ]);

  return {
    byCategory: byCategory as unknown as CategoryInsight[],
    monthlyTrend: monthlyTrend as unknown as MonthlyTrendInsight[],
    byCard: byCard as unknown as CardInsight[],
    topMerchants: topMerchants as unknown as MerchantInsight[],
    summary: (summary[0] as SpendSummary | undefined) ?? null,
    typeCounts: typeCounts as unknown as TypeCount[],
    recent,
  };
}

export async function deleteTransactionsForStatement(
  statementId: ObjectId,
  userId: ObjectId,
): Promise<number> {
  const db = await getDb();
  const res = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .deleteMany({ statementId, userId });
  return res.deletedCount ?? 0;
}

export async function updateCategoryById(
  userId: string,
  transactionId: string,
  category: Category,
): Promise<boolean> {
  if (!ObjectId.isValid(transactionId)) return false;
  const db = await getDb();
  const res = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .updateOne(
      { _id: new ObjectId(transactionId), userId: new ObjectId(userId) },
      { $set: { category, categorizedBy: "user" } },
    );
  return res.matchedCount > 0;
}

export async function updateCategoryByMerchant(
  userId: string,
  merchant: string,
  category: Category,
): Promise<number> {
  const db = await getDb();
  const res = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .updateMany(
      { userId: new ObjectId(userId), merchant },
      { $set: { category, categorizedBy: "user" } },
    );
  return res.modifiedCount ?? 0;
}

export interface AuditSampleArgs {
  userId: string;
  sampleSize: number;
  sources: CategorizationMethod[];
  cardType?: CardType;
  category?: Category;
}

export interface AuditSampleRow {
  _id: ObjectId;
  merchant: string;
  rawDescription: string;
  category: Category;
  categorizedBy: CategorizationMethod;
  transactionDate: Date;
  amount: number;
  cardType: CardType;
  sourceCategory: string | null;
}

/**
 * Random audit sample. Prefers transactions never audited (lastAuditedAt missing),
 * then least-recently-audited. Restricted to debit transactions whose category is
 * not "Payment/Credit" — payments/credits are deterministic and not worth auditing.
 */
export async function sampleTransactionsForAudit(
  args: AuditSampleArgs,
): Promise<AuditSampleRow[]> {
  if (args.sources.length === 0) return [];
  const db = await getDb();
  const match: Record<string, unknown> = {
    userId: new ObjectId(args.userId),
    type: "debit",
    category: { $ne: "Payment/Credit" },
    categorizedBy: { $in: args.sources },
  };
  if (args.cardType) match.cardType = args.cardType;
  if (args.category) match.category = args.category;

  const poolSize = args.sampleSize * 3;
  const pipeline: Record<string, unknown>[] = [
    { $match: match },
    {
      $addFields: {
        auditPriority: { $ifNull: ["$lastAuditedAt", new Date(0)] },
      },
    },
    { $sort: { auditPriority: 1 } },
    { $limit: poolSize },
    { $sample: { size: args.sampleSize } },
    {
      $project: {
        _id: 1,
        merchant: 1,
        rawDescription: 1,
        category: 1,
        categorizedBy: 1,
        transactionDate: 1,
        amount: 1,
        cardType: 1,
        sourceCategory: 1,
      },
    },
  ];

  const docs = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .aggregate<AuditSampleRow>(pipeline)
    .toArray();
  return docs;
}

export async function markTransactionsAudited(
  userId: string,
  transactionIds: string[],
): Promise<number> {
  if (transactionIds.length === 0) return 0;
  const validIds = transactionIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (validIds.length === 0) return 0;
  const db = await getDb();
  const res = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .updateMany(
      { _id: { $in: validIds }, userId: new ObjectId(userId) },
      { $set: { lastAuditedAt: new Date() } },
    );
  return res.modifiedCount ?? 0;
}

export async function applyAuditCorrection(
  userId: string,
  transactionId: string,
  category: Category,
): Promise<boolean> {
  if (!ObjectId.isValid(transactionId)) return false;
  const db = await getDb();
  const res = await db
    .collection<TransactionDoc>(COLLECTIONS.transactions)
    .updateOne(
      { _id: new ObjectId(transactionId), userId: new ObjectId(userId) },
      {
        $set: {
          category,
          categorizedBy: "ai",
          lastAuditedAt: new Date(),
        },
      },
    );
  return res.matchedCount > 0;
}
