import { ObjectId } from "mongodb";
import { COLLECTIONS, getDb } from "@/lib/db";
import type { CardType, FileFormat, StatementDoc, UploadStats } from "@/types";

export interface InsertStatementInput {
  _id?: ObjectId;
  userId: ObjectId;
  cardType: CardType;
  originalFilename: string;
  fileFormat: FileFormat;
  statementDate: Date | null;
  transactionCount: number;
  totalAmount: number;
  uploadStats?: UploadStats;
}

export async function insertStatement(input: InsertStatementInput): Promise<StatementDoc> {
  const db = await getDb();
  const doc: StatementDoc = {
    _id: input._id ?? new ObjectId(),
    userId: input.userId,
    cardType: input.cardType,
    originalFilename: input.originalFilename,
    fileFormat: input.fileFormat,
    statementDate: input.statementDate,
    uploadedAt: new Date(),
    transactionCount: input.transactionCount,
    totalAmount: input.totalAmount,
    ...(input.uploadStats ? { uploadStats: input.uploadStats } : {}),
  };
  await db.collection<StatementDoc>(COLLECTIONS.statements).insertOne(doc);
  return doc;
}

export async function deleteStatement(
  id: string,
  userId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDb();
  const res = await db
    .collection<StatementDoc>(COLLECTIONS.statements)
    .deleteOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
  return (res.deletedCount ?? 0) > 0;
}

export async function getStatementsForUser(userId: string): Promise<StatementDoc[]> {
  const db = await getDb();
  return db
    .collection<StatementDoc>(COLLECTIONS.statements)
    .find({ userId: new ObjectId(userId) })
    .sort({ uploadedAt: -1 })
    .toArray();
}

export async function getStatementById(
  id: string,
  userId: string,
): Promise<StatementDoc | null> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;
  return db
    .collection<StatementDoc>(COLLECTIONS.statements)
    .findOne({ _id: new ObjectId(id), userId: new ObjectId(userId) });
}
