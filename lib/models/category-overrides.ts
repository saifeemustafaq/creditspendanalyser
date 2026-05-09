import { ObjectId } from "mongodb";
import { COLLECTIONS, getDb } from "@/lib/db";
import type { Category, CategoryOverrideDoc } from "@/types";

export async function getOverridesForUser(userId: string): Promise<CategoryOverrideDoc[]> {
  const db = await getDb();
  return db
    .collection<CategoryOverrideDoc>(COLLECTIONS.categoryOverrides)
    .find({ userId: new ObjectId(userId) })
    .toArray();
}

export async function getOverrideMap(userId: string): Promise<Map<string, Category>> {
  const rows = await getOverridesForUser(userId);
  const map = new Map<string, Category>();
  for (const row of rows) {
    map.set(row.merchantNormalized, row.category);
  }
  return map;
}

export async function upsertOverride(args: {
  userId: string;
  merchantNormalized: string;
  category: Category;
}): Promise<void> {
  const db = await getDb();
  const userObjectId = new ObjectId(args.userId);
  await db.collection<CategoryOverrideDoc>(COLLECTIONS.categoryOverrides).updateOne(
    { userId: userObjectId, merchantNormalized: args.merchantNormalized },
    {
      $set: { category: args.category },
      $setOnInsert: {
        userId: userObjectId,
        merchantNormalized: args.merchantNormalized,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}
