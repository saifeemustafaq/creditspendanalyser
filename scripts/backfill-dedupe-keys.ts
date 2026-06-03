/**
 * CLI: npx tsx scripts/backfill-dedupe-keys.ts
 * Computes dedupeKey for transactions missing it. Run before relying on overlap detection.
 */
import { config } from "dotenv";
import { ObjectId } from "mongodb";
import { COLLECTIONS, ensureTransactionIndexes, getDb } from "@/lib/db";
import { computeDedupeKey } from "@/lib/services/transaction-dedupe";
import type { TransactionDoc } from "@/types";

config({ path: ".env.local" });

function isoDatePart(d: Date | null | undefined): string {
  if (!d) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  const db = await getDb();
  const coll = db.collection<TransactionDoc>(COLLECTIONS.transactions);

  const cursor = coll.find({
    $or: [{ dedupeKey: { $exists: false } }, { dedupeKey: "" }],
  });

  const keyCounts = new Map<string, number>();
  const ops: { updateOne: { filter: { _id: ObjectId }; update: { $set: { dedupeKey: string } } } }[] =
    [];

  let scanned = 0;
  for await (const doc of cursor) {
    scanned += 1;
    const key = computeDedupeKey({
      cardType: doc.cardType,
      transactionDate: isoDatePart(doc.transactionDate),
      postDate: isoDatePart(doc.postDate),
      type: doc.type,
      amount: doc.amount,
      merchant: doc.merchant,
      rawDescription: doc.rawDescription,
    });
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { dedupeKey: key } },
      },
    });
  }

  if (ops.length > 0) {
    const BATCH = 500;
    for (let i = 0; i < ops.length; i += BATCH) {
      await coll.bulkWrite(ops.slice(i, i + BATCH));
    }
  }

  const collisions = [...keyCounts.entries()].filter(([, c]) => c > 1);
  console.log(`Scanned ${scanned} transactions without dedupeKey`);
  console.log(`Updated ${ops.length} documents`);
  if (collisions.length > 0) {
    console.warn(
      `Warning: ${collisions.length} dedupe key(s) appear on multiple existing rows. Resolve before unique index if needed.`,
    );
    for (const [key, count] of collisions.slice(0, 10)) {
      console.warn(`  ${key} (${count} rows)`);
    }
  }

  await ensureTransactionIndexes();
  console.log("Ensured userId + dedupeKey sparse unique index");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
