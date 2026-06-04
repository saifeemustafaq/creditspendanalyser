import type { ExtractedTransaction, TransactionType } from "@/types";
import type { StructuredRow } from "@/lib/parsers";
import { normalizeMerchant } from "@/lib/services/merchant-normalizer";
import type { RowAdapter } from "./types";

/**
 * Amex BCP sign convention: positive = purchase (debit), negative = payment/credit.
 * Payment rows carry no sourceCategory, so payment detection uses the description
 * keyword ("MOBILE PAYMENT", "AUTOPAY") rather than the sourceCategory field.
 */
export const amexAdapter: RowAdapter = (row: StructuredRow): ExtractedTransaction => {
  const merchant =
    normalizeMerchant(row.description) || row.description.split(/\r?\n/)[0] || "Unknown";

  let type: TransactionType = "debit";
  if (row.amount < 0) {
    const desc = row.description.toLowerCase();
    if (/payment|autopay/.test(desc)) {
      type = "payment";
    } else if (/reward|rebate|cash.?back/i.test(desc)) {
      type = "reward";
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
