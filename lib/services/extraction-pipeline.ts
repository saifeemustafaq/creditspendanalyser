import { ObjectId } from "mongodb";
import type {
  CardType,
  CategorizationMethod,
  Category,
  ExtractedTransaction,
  FileFormat,
  TransactionType,
  UploadStats,
} from "@/types";
import { parseFile, type StructuredRow } from "@/lib/parsers";
import { detectCardTypeFromText } from "@/lib/services/card-detector";
import {
  detectCardTypeViaLLM,
  extractFromImage,
  extractFromText,
} from "@/lib/services/extractor";
import { categorizeTransactions } from "@/lib/services/categorizer";
import { getRowAdapter } from "@/lib/services/issuer-adapters";
import { normalizeMerchant, normalizeMerchantKey } from "@/lib/services/merchant-normalizer";
import { insertStatement } from "@/lib/models/statements";
import { insertTransactions } from "@/lib/models/transactions";
import { getOverrideMap, upsertOverride } from "@/lib/models/category-overrides";

export interface PreviewTransaction {
  transactionDate: string;
  postDate: string | null;
  merchant: string;
  amount: number;
  type: TransactionType;
  rawDescription: string;
  sourceCategory: string | null;
  category: Category;
  categorizedBy: CategorizationMethod;
}

export interface PreviewResult {
  cardType: CardType;
  fileFormat: FileFormat;
  statementDate: string | null;
  transactions: PreviewTransaction[];
}

export interface ConfirmResult {
  statementId: string;
  transactionCount: number;
  totalAmount: number;
}

function detectStatementDateFromRows(rows: StructuredRow[]): string | null {
  let latest: string | null = null;
  for (const r of rows) {
    if (!latest || r.transactionDate > latest) latest = r.transactionDate;
  }
  return latest;
}

export interface ParseAndPreviewArgs {
  userId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  overrideCardType?: CardType;
}

export async function parseAndPreview(args: ParseAndPreviewArgs): Promise<PreviewResult> {
  const { userId, buffer, filename, mimeType, overrideCardType } = args;

  const parsed = await parseFile(buffer, filename, mimeType);

  let cardType: CardType | null = overrideCardType ?? null;
  if (!cardType && parsed.text) cardType = detectCardTypeFromText(parsed.text);
  if (!cardType && parsed.text) cardType = await detectCardTypeViaLLM(parsed.text);
  if (!cardType) cardType = "visa";

  let extracted: ExtractedTransaction[];
  let statementDate: string | null = null;

  if (parsed.structuredRows && parsed.structuredRows.length > 0) {
    // Direct structured path — no AI needed for extraction.
    const adapter = getRowAdapter(cardType);
    extracted = parsed.structuredRows.map(adapter);
    statementDate = detectStatementDateFromRows(parsed.structuredRows);
  } else if (parsed.format === "image") {
    const result = await extractFromImage(cardType, parsed.imageDataUrl ?? "");
    extracted = result.transactions;
    statementDate = result.statementDate ? toIsoDate(result.statementDate) : null;
  } else {
    const result = await extractFromText(cardType, parsed.text);
    extracted = result.transactions;
    statementDate = result.statementDate ? toIsoDate(result.statementDate) : null;
  }

  // Always normalize merchant for clean display.
  extracted = extracted.map((tx) => ({
    ...tx,
    merchant: normalizeMerchant(tx.merchant) || tx.merchant || "Unknown",
  }));

  const overrideMap = await getOverrideMap(userId);
  const categorized = categorizeTransactions(extracted, { overrideMap, cardType });

  const transactions: PreviewTransaction[] = categorized.map((t) => ({
    transactionDate: t.transactionDate,
    postDate: t.postDate ?? null,
    merchant: t.merchant,
    amount: t.amount,
    type: t.type,
    rawDescription: t.rawDescription,
    sourceCategory: t.sourceCategory ?? null,
    category: t.category,
    categorizedBy: t.categorizedBy,
  }));

  return {
    cardType,
    fileFormat: parsed.format,
    statementDate,
    transactions,
  };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface ConfirmAndSaveArgs {
  userId: string;
  cardType: CardType;
  fileFormat: FileFormat;
  originalFilename: string;
  statementDate: string | null;
  transactions: PreviewTransaction[];
}

export async function confirmAndSave(args: ConfirmAndSaveArgs): Promise<ConfirmResult> {
  const userObjectId = new ObjectId(args.userId);
  const statementId = new ObjectId();

  const txDocs = args.transactions
    .map((t) => {
      const txDate = new Date(t.transactionDate);
      if (Number.isNaN(txDate.getTime())) return null;
      return {
        statementId,
        userId: userObjectId,
        cardType: args.cardType,
        transactionDate: txDate,
        postDate: t.postDate ? new Date(t.postDate) : null,
        merchant: t.merchant,
        category: t.category,
        amount: t.amount,
        type: t.type,
        rawDescription: t.rawDescription,
        sourceCategory: t.sourceCategory,
        categorizedBy: t.categorizedBy,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const totalAmount = txDocs.reduce(
    (sum, t) => (t.type === "debit" ? sum + t.amount : sum),
    0,
  );

  const statementDateObj = args.statementDate ? new Date(args.statementDate) : null;
  const safeStatementDate =
    statementDateObj && !Number.isNaN(statementDateObj.getTime()) ? statementDateObj : null;

  const categorization: Partial<Record<CategorizationMethod, number>> = {};
  let uncategorized = 0;
  for (const t of txDocs) {
    if (t.categorizedBy) {
      categorization[t.categorizedBy] = (categorization[t.categorizedBy] ?? 0) + 1;
    }
    if (t.type === "debit" && t.category === "Other") uncategorized += 1;
  }

  const uploadStats: UploadStats = {
    rowsParsed: args.transactions.length,
    rowsSaved: txDocs.length,
    categorization,
    uncategorized,
  };

  await insertStatement({
    _id: statementId,
    userId: userObjectId,
    cardType: args.cardType,
    originalFilename: args.originalFilename,
    fileFormat: args.fileFormat,
    statementDate: safeStatementDate,
    transactionCount: txDocs.length,
    totalAmount,
    uploadStats,
  });

  if (txDocs.length > 0) await insertTransactions(txDocs);

  // Persist user and AI overrides so they apply to future uploads.
  // "user" = manual dropdown change, "ai" = accepted AI prediction.
  // We skip issuer/rule since those are deterministic and already handled.
  const LEARNABLE_METHODS: CategorizationMethod[] = ["user", "ai"];
  for (const t of args.transactions) {
    if (!LEARNABLE_METHODS.includes(t.categorizedBy)) continue;
    if (t.category === "Other") continue;
    const key = normalizeMerchantKey(t.merchant ?? t.rawDescription ?? "");
    if (!key) continue;
    try {
      await upsertOverride({
        userId: args.userId,
        merchantNormalized: key,
        category: t.category,
      });
    } catch (err) {
      console.error("Failed to upsert category override:", err);
    }
  }

  return {
    statementId: statementId.toString(),
    transactionCount: txDocs.length,
    totalAmount,
  };
}

export interface PipelineResult {
  statementId: string;
  cardType: CardType;
  fileFormat: FileFormat;
  statementDate: Date | null;
  transactionCount: number;
  totalAmount: number;
}

/**
 * Legacy single-shot pipeline kept for backward compatibility with the existing
 * `POST /api/upload` route. Calls `parseAndPreview` then `confirmAndSave` with
 * no user review step.
 */
export async function runExtractionPipeline(args: {
  userId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  overrideCardType?: CardType;
}): Promise<PipelineResult> {
  const preview = await parseAndPreview(args);
  const saved = await confirmAndSave({
    userId: args.userId,
    cardType: preview.cardType,
    fileFormat: preview.fileFormat,
    originalFilename: args.filename,
    statementDate: preview.statementDate,
    transactions: preview.transactions,
  });
  return {
    statementId: saved.statementId,
    cardType: preview.cardType,
    fileFormat: preview.fileFormat,
    statementDate: preview.statementDate ? new Date(preview.statementDate) : null,
    transactionCount: saved.transactionCount,
    totalAmount: saved.totalAmount,
  };
}
