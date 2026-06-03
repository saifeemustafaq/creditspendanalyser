import { createHash } from "node:crypto";
import type { CardType, TransactionType } from "@/types";
import { normalizeMerchantKey } from "@/lib/services/merchant-normalizer";

const RAW_FINGERPRINT_MAX = 500;

export type DedupeInput = {
  cardType: CardType;
  transactionDate: string;
  postDate: string | null;
  type: TransactionType;
  amount: number;
  merchant: string;
  rawDescription: string;
};

export type DuplicateReason = "existing" | "in_file";

export type DedupeRowInput = Omit<DedupeInput, "cardType">;

export type PartitionResult<T extends DedupeRowInput> = {
  toSave: T[];
  keysToSave: string[];
  skippedExisting: number;
  skippedInFile: number;
};

function normalizeRawForFingerprint(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim().slice(0, RAW_FINGERPRINT_MAX);
}

function rawFingerprint(rawDescription: string): string {
  const normalized = normalizeRawForFingerprint(rawDescription);
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function isoDatePart(dateStr: string | null): string {
  if (!dateStr) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(dateStr.trim());
  return m ? m[1] : "";
}

/**
 * Stable fingerprint for duplicate detection across statement uploads.
 * Scoped per cardType. Includes raw description hash so two same-day
 * charges at the same merchant with different auth codes stay distinct.
 *
 * Tradeoff: identical issuer export lines on re-upload match and are skipped.
 */
export function computeDedupeKey(input: DedupeInput): string {
  const merchantKey = normalizeMerchantKey(input.merchant || input.rawDescription);
  const amountCents = Math.round(input.amount * 100);
  const txDate = isoDatePart(input.transactionDate);
  const post = isoDatePart(input.postDate);
  const fp = rawFingerprint(input.rawDescription);
  return [
    input.cardType,
    txDate,
    post,
    input.type,
    String(amountCents),
    merchantKey,
    fp,
  ].join("|");
}

export function partitionTransactions<T extends DedupeRowInput>(args: {
  incoming: T[];
  cardType: CardType;
  existingKeys: Set<string>;
}): PartitionResult<T> {
  const { incoming, existingKeys, cardType } = args;
  const toSave: T[] = [];
  const keysToSave: string[] = [];
  const seenInFile = new Set<string>();
  let skippedExisting = 0;
  let skippedInFile = 0;

  for (const row of incoming) {
    const key = computeDedupeKey({ ...row, cardType });
    if (existingKeys.has(key)) {
      skippedExisting += 1;
      continue;
    }
    if (seenInFile.has(key)) {
      skippedInFile += 1;
      continue;
    }
    seenInFile.add(key);
    toSave.push(row);
    keysToSave.push(key);
  }

  return { toSave, keysToSave, skippedExisting, skippedInFile };
}

export type MarkedDuplicate<T extends DedupeRowInput> = T & {
  isDuplicate: boolean;
  duplicateReason?: DuplicateReason;
};

/**
 * Label each incoming row as duplicate (existing DB or earlier row in same file).
 */
export function markDuplicates<T extends DedupeRowInput>(args: {
  incoming: T[];
  cardType: CardType;
  existingKeys: Set<string>;
}): { rows: MarkedDuplicate<T>[]; summary: DuplicateSummary } {
  const { incoming, existingKeys, cardType } = args;
  const seenInFile = new Set<string>();
  let existing = 0;
  let inFile = 0;

  const rows: MarkedDuplicate<T>[] = incoming.map((row) => {
    const key = computeDedupeKey({ ...row, cardType });
    if (existingKeys.has(key)) {
      existing += 1;
      return { ...row, isDuplicate: true, duplicateReason: "existing" as const };
    }
    if (seenInFile.has(key)) {
      inFile += 1;
      return { ...row, isDuplicate: true, duplicateReason: "in_file" as const };
    }
    seenInFile.add(key);
    return { ...row, isDuplicate: false };
  });

  const newCount = incoming.length - existing - inFile;
  return {
    rows,
    summary: { existing, inFile, newCount },
  };
}

export type DuplicateSummary = {
  existing: number;
  inFile: number;
  newCount: number;
};
