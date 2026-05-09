import type { ExtractedTransaction, TransactionType } from "@/types";
import type { StructuredRow } from "@/lib/parsers";
import { normalizeMerchant } from "@/lib/services/merchant-normalizer";
import type { RowAdapter } from "./types";

/**
 * Discover-style sign convention: positive = purchase (debit), negative = payment/credit.
 * The sourceCategory hint distinguishes payment vs reward credit on the negative side.
 */
export const discoverAdapter: RowAdapter = (row: StructuredRow): ExtractedTransaction => {
  const merchant =
    normalizeMerchant(row.description) || row.description.split(/\r?\n/)[0] || "Unknown";
  let type: TransactionType = "debit";
  if (row.amount < 0) {
    if (row.sourceCategory && /payment/i.test(row.sourceCategory)) {
      type = "payment";
    } else {
      type = "credit";
    }
  }
  return {
    transactionDate: row.transactionDate,
    postDate: row.postDate ?? null,
    merchant,
    amount: Math.abs(row.amount),
    type,
    rawDescription: row.description,
    sourceCategory: row.sourceCategory,
  };
};
