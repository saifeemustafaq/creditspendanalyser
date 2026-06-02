import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeDedupeKey,
  markDuplicates,
  partitionTransactions,
  type DedupeInput,
} from "@/lib/services/transaction-dedupe";

const base: DedupeInput = {
  cardType: "discover_it_student",
  transactionDate: "2025-03-15",
  postDate: "2025-03-17",
  type: "debit",
  amount: 12.5,
  merchant: "Starbucks",
  rawDescription: "STARBUCKS STORE 12345 SAN FRANCISCO CA",
};

describe("computeDedupeKey", () => {
  it("produces identical keys for identical inputs", () => {
    const a = computeDedupeKey(base);
    const b = computeDedupeKey({ ...base });
    assert.equal(a, b);
  });

  it("differs when cardType differs", () => {
    const a = computeDedupeKey(base);
    const b = computeDedupeKey({ ...base, cardType: "visa" });
    assert.notEqual(a, b);
  });

  it("differs when rawDescription differs", () => {
    const a = computeDedupeKey(base);
    const b = computeDedupeKey({
      ...base,
      rawDescription: "STARBUCKS STORE 99999 SAN FRANCISCO CA",
    });
    assert.notEqual(a, b);
  });
});

describe("partitionTransactions", () => {
  it("skips rows matching existing keys", () => {
    const key = computeDedupeKey(base);
    const result = partitionTransactions({
      incoming: [base, { ...base }],
      cardType: base.cardType,
      existingKeys: new Set([key]),
    });
    assert.equal(result.toSave.length, 0);
    assert.equal(result.skippedExisting, 2);
    assert.equal(result.skippedInFile, 0);
  });

  it("skips second row when duplicate within file", () => {
    const result = partitionTransactions({
      incoming: [base, { ...base }],
      cardType: base.cardType,
      existingKeys: new Set(),
    });
    assert.equal(result.toSave.length, 1);
    assert.equal(result.skippedExisting, 0);
    assert.equal(result.skippedInFile, 1);
  });

  it("keeps distinct rows in the same upload", () => {
    const result = partitionTransactions({
      incoming: [base, { ...base, amount: 99 }],
      cardType: base.cardType,
      existingKeys: new Set(),
    });
    assert.equal(result.toSave.length, 2);
  });
});

describe("markDuplicates", () => {
  it("labels existing and in-file duplicates", () => {
    const key = computeDedupeKey(base);
    const { rows, summary } = markDuplicates({
      incoming: [base, { ...base }, { ...base, amount: 99 }],
      cardType: base.cardType,
      existingKeys: new Set([key]),
    });
    assert.equal(summary.existing, 2);
    assert.equal(summary.inFile, 0);
    assert.equal(summary.newCount, 1);
    assert.equal(rows[0].isDuplicate, true);
    assert.equal(rows[0].duplicateReason, "existing");
    assert.equal(rows[1].isDuplicate, true);
    assert.equal(rows[1].duplicateReason, "existing");
    assert.equal(rows[2].isDuplicate, false);
  });

  it("labels in-file duplicate when not already in database", () => {
    const { rows, summary } = markDuplicates({
      incoming: [base, { ...base }],
      cardType: base.cardType,
      existingKeys: new Set(),
    });
    assert.equal(summary.existing, 0);
    assert.equal(summary.inFile, 1);
    assert.equal(summary.newCount, 1);
    assert.equal(rows[1].duplicateReason, "in_file");
  });
});
