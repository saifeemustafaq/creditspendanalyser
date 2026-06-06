import type { ExtractedTransaction, TransactionType } from "@/types";
import type { StructuredRow } from "@/lib/parsers";
import { normalizeMerchant } from "@/lib/services/merchant-normalizer";
import type { RowAdapter } from "./types";

/**
 * Robinhood Gold Card adapter.
 *
 * Sign convention: positive = purchase/fee (debit), negative = payment/fee-reversal.
 * Type column is authoritative; sign is the fallback.
 *
 * Pending rows are skipped (return null) — they'll reappear as Posted on the
 * next CSV upload with the final settled amount, avoiding stale/duplicate entries.
 */
export const robinhoodAdapter: RowAdapter = (row: StructuredRow): ExtractedTransaction | null => {
  if (row.rawFields["Status"]?.toLowerCase() === "pending") return null;

  // Prefer the clean Merchant column; fall back to normalizing raw Description.
  const merchantRaw = row.rawFields["Merchant"]?.trim();
  const merchant =
    (merchantRaw && merchantRaw.toLowerCase() !== "payment"
      ? merchantRaw
      : normalizeMerchant(row.description)) ||
    row.description.split(/\r?\n/)[0] ||
    "Unknown";

  const hint = row.typeHint?.toLowerCase().trim() ?? "";
  let type: TransactionType;
  if (hint === "payment") {
    type = "payment";
  } else if (hint === "fee") {
    type = row.amount < 0 ? "credit" : "debit";
  } else if (hint === "purchase" || hint === "") {
    type = "debit";
  } else {
    // Unknown type hint — fall back to sign convention.
    type = row.amount < 0 ? "payment" : "debit";
  }

  return {
    transactionDate: row.transactionDate,
    postDate: row.postDate ?? null,
    merchant,
    amount: Math.abs(row.amount),
    type,
    rawDescription: row.rawFields["Description"] || row.description,
    sourceCategory: row.sourceCategory,
  };
};
