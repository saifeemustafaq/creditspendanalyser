import { ObjectId } from "mongodb";
import { COLLECTIONS, getDb } from "@/lib/db";
import type { CardSettingsDoc, CardType } from "@/types";

export async function getCardSettingsForUser(userId: string): Promise<CardSettingsDoc[]> {
  const db = await getDb();
  return db
    .collection<CardSettingsDoc>(COLLECTIONS.cardSettings)
    .find({ userId: new ObjectId(userId) })
    .toArray();
}

export async function upsertCardStartDate(args: {
  userId: string;
  cardType: CardType;
  startDate: Date;
}): Promise<void> {
  const db = await getDb();
  const userObjectId = new ObjectId(args.userId);
  await db.collection<CardSettingsDoc>(COLLECTIONS.cardSettings).updateOne(
    { userId: userObjectId, cardType: args.cardType },
    {
      $set: { startDate: args.startDate, updatedAt: new Date() },
      $setOnInsert: { userId: userObjectId, cardType: args.cardType },
    },
    { upsert: true },
  );
}

/** Track a card on the coverage page without setting an open date yet. */
export async function trackCard(args: { userId: string; cardType: CardType }): Promise<void> {
  const db = await getDb();
  const userObjectId = new ObjectId(args.userId);
  await db.collection<CardSettingsDoc>(COLLECTIONS.cardSettings).updateOne(
    { userId: userObjectId, cardType: args.cardType },
    {
      $set: { updatedAt: new Date() },
      $setOnInsert: { userId: userObjectId, cardType: args.cardType },
    },
    { upsert: true },
  );
}

export async function deleteCardSettings(userId: string, cardType: CardType): Promise<void> {
  const db = await getDb();
  await db
    .collection<CardSettingsDoc>(COLLECTIONS.cardSettings)
    .deleteOne({ userId: new ObjectId(userId), cardType });
}
