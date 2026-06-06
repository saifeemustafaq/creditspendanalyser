import {
  categorizeBatchWithAI,
  type AIBatchInput,
  type AIBatchResult,
} from "@/lib/services/categorizer";
import { AI_CATEGORIZE_BATCH_SIZE } from "@/lib/constants";
import type { CardType, CategorizationMethod, Category } from "@/types";

export type DisagreementRow = {
  _id: string;
  transactionDate: string;
  merchant: string;
  rawDescription: string;
  amount: number;
  cardType: CardType;
  currentCategory: Category;
  categorizedBy: CategorizationMethod;
  sourceCategory: string | null;
  aiSuggestedCategory: Category;
};

export type MatchRow = {
  _id: string;
  merchant: string;
  category: Category;
  categorizedBy: CategorizationMethod;
};

export type AuditSummary = {
  sampled: number;
  matches: number;
  disagreements: number;
  accuracyPct: number;
};

export type AuditSampleResult = {
  summary: AuditSummary;
  disagreements: DisagreementRow[];
  matches: MatchRow[];
};

export type AuditSampleRow = {
  _id: { toString(): string };
  transactionDate: Date;
  merchant: string;
  rawDescription?: string | null;
  amount: number;
  cardType: CardType;
  category: Category;
  categorizedBy: CategorizationMethod;
  sourceCategory?: string | null;
};

/** Batches AI categorization for samples larger than the batch size. */
async function aiCategorizeAll(rows: AIBatchInput[]): Promise<AIBatchResult[]> {
  if (rows.length <= AI_CATEGORIZE_BATCH_SIZE) {
    return categorizeBatchWithAI(rows);
  }
  const out: AIBatchResult[] = [];
  for (let i = 0; i < rows.length; i += AI_CATEGORIZE_BATCH_SIZE) {
    const slice = rows.slice(i, i + AI_CATEGORIZE_BATCH_SIZE);
    const part = await categorizeBatchWithAI(slice);
    for (const r of part) {
      out.push({ index: r.index + i, category: r.category });
    }
  }
  return out;
}

/**
 * Runs the AI cross-check on a sample of transactions and returns the
 * disagreement/match breakdown plus accuracy summary.
 */
export async function runAuditSample(sample: AuditSampleRow[]): Promise<AuditSampleResult> {
  if (sample.length === 0) {
    return {
      summary: { sampled: 0, matches: 0, disagreements: 0, accuracyPct: 0 },
      disagreements: [],
      matches: [],
    };
  }

  const aiInput: AIBatchInput[] = sample.map((tx) => ({
    merchant: tx.merchant,
    rawDescription: tx.rawDescription ?? "",
  }));
  const aiResults = await aiCategorizeAll(aiInput);
  const aiByIndex = new Map<number, Category>();
  for (const r of aiResults) aiByIndex.set(r.index, r.category);

  const disagreements: DisagreementRow[] = [];
  const matches: MatchRow[] = [];

  for (let i = 0; i < sample.length; i++) {
    const tx = sample[i];
    const aiCategory = aiByIndex.get(i);
    if (!aiCategory) continue;
    if (aiCategory === tx.category) {
      matches.push({
        _id: tx._id.toString(),
        merchant: tx.merchant,
        category: tx.category,
        categorizedBy: tx.categorizedBy,
      });
    } else {
      disagreements.push({
        _id: tx._id.toString(),
        transactionDate: tx.transactionDate.toISOString(),
        merchant: tx.merchant,
        rawDescription: tx.rawDescription ?? "",
        amount: tx.amount,
        cardType: tx.cardType,
        currentCategory: tx.category,
        categorizedBy: tx.categorizedBy,
        sourceCategory: tx.sourceCategory ?? null,
        aiSuggestedCategory: aiCategory,
      });
    }
  }

  const sampled = matches.length + disagreements.length;
  const accuracyPct = sampled === 0 ? 0 : Math.round((matches.length / sampled) * 100);

  return {
    summary: { sampled, matches: matches.length, disagreements: disagreements.length, accuracyPct },
    disagreements,
    matches,
  };
}
