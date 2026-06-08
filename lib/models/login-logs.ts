import { ObjectId } from "mongodb";
import { LOGIN_LOG_MAX_ENTRIES } from "@/lib/constants";
import { COLLECTIONS, getDb } from "@/lib/db";
import type { LoginAttemptLogDoc } from "@/types";

let indexesEnsured = false;

export async function ensureLoginLogIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db
    .collection(COLLECTIONS.loginAttemptLogs)
    .createIndex({ createdAt: -1 }, { name: "createdAt_desc" });
  indexesEnsured = true;
}

function generateLogId(): string {
  return `lg_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export type InsertLoginFailureLogInput = Omit<
  LoginAttemptLogDoc,
  "_id" | "logId" | "createdAt"
>;

export async function insertLoginFailureLog(
  entry: InsertLoginFailureLogInput,
): Promise<string> {
  await ensureLoginLogIndexes();
  const db = await getDb();
  const logId = generateLogId();
  await db.collection<LoginAttemptLogDoc>(COLLECTIONS.loginAttemptLogs).insertOne({
    _id: new ObjectId(),
    logId,
    ...entry,
    createdAt: new Date(),
  } as LoginAttemptLogDoc);
  return logId;
}

export type LoginAttemptLogRow = Omit<LoginAttemptLogDoc, "_id"> & { _id: string };

export async function listRecentLoginFailureLogs(
  limit = LOGIN_LOG_MAX_ENTRIES,
): Promise<LoginAttemptLogRow[]> {
  const db = await getDb();
  const rows = await db
    .collection<LoginAttemptLogDoc>(COLLECTIONS.loginAttemptLogs)
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return rows.map((row) => ({
    ...row,
    _id: row._id.toString(),
    createdAt: row.createdAt,
  }));
}
