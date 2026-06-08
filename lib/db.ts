import { MongoClient, type Db } from "mongodb";

declare global {
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to .env.local.");
  }
  if (!global.__mongoClientPromise) {
    const client = new MongoClient(uri);
    global.__mongoClientPromise = client.connect();
  }
  return global.__mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB ?? "credit-spend");
}

export const COLLECTIONS = {
  users: "users",
  statements: "statements",
  transactions: "transactions",
  categoryOverrides: "category_overrides",
  recurringOverrides: "recurring_overrides",
  cardSettings: "card_settings",
} as const;

/** Sparse unique index: one stored row per dedupeKey per user (legacy rows omit dedupeKey). */
export async function ensureTransactionIndexes(): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.transactions).createIndex(
    { userId: 1, dedupeKey: 1 },
    { unique: true, sparse: true, name: "userId_dedupeKey_unique" },
  );
}
