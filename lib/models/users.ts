import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { COLLECTIONS, getDb } from "@/lib/db";
import { BCRYPT_SALT_ROUNDS } from "@/lib/constants";
import type { UserDoc } from "@/types";

export async function findUserByUsername(username: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>(COLLECTIONS.users).findOne({ username });
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;
  return db.collection<UserDoc>(COLLECTIONS.users).findOne({ _id: new ObjectId(id) });
}

export async function createUser(username: string, password: string): Promise<UserDoc> {
  const db = await getDb();
  const existing = await findUserByUsername(username);
  if (existing) throw new Error(`User ${username} already exists.`);
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const result = await db.collection<UserDoc>(COLLECTIONS.users).insertOne({
    _id: new ObjectId(),
    username,
    passwordHash,
    createdAt: new Date(),
  } as UserDoc);
  return {
    _id: result.insertedId,
    username,
    passwordHash,
    createdAt: new Date(),
  };
}

export async function validatePassword(user: UserDoc, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function updatePasswordByUsername(
  username: string,
  password: string,
): Promise<boolean> {
  const db = await getDb();
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const result = await db
    .collection<UserDoc>(COLLECTIONS.users)
    .updateOne({ username }, { $set: { passwordHash } });
  return result.matchedCount > 0;
}
