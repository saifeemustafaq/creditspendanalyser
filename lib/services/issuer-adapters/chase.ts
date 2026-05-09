import type { ExtractedTransaction, TransactionType } from "@/types";
import type { StructuredRow } from "@/lib/parsers";
import { normalizeMerchant } from "@/lib/services/merchant-normalizer";
import type { RowAdapter } from "./types";

/**
 * Chase Sapphire-style: inverted sign + authoritative Type column.
 * Sale/Fee → debit; Payment → payment; Return/Adjustment (credits) → credit.
 * Amounts are stored as positive; direction lives in `type`.
 */
function typeFromRow(row: StructuredRow): TransactionType {
  const hint = row.typeHint?.toLowerCase().trim() ?? "";
  if (hint === "payment") return "payment";
  if (hint === "sale" || hint === "fee") return "debit";
  if (hint === "return") return "credit";
  if (hint === "adjustment") {
    // Adjustments can go either direction; Chase encodes that in sign.
    return row.amount > 0 ? "credit" : "debit";
  }
  // Fallback for missing/unknown type hint: use Chase sign convention
  // (negative = purchase, positive = payment/credit).
  if (row.amount < 0) return "debit";
  return "credit";
}

export const chaseAdapter: RowAdapter = (row: StructuredRow): ExtractedTransaction => {
  const merchant =
    normalizeMerchant(row.description) || row.description.split(/\r?\n/)[0] || "Unknown";
  const type = typeFromRow(row);
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
