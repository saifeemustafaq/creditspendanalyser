import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sampleTransactionsForAudit } from "@/lib/models/transactions";
import {
  categorizeBatchWithAI,
  type AIBatchInput,
  type AIBatchResult,
} from "@/lib/services/categorizer";
import {
  AI_CATEGORIZE_BATCH_SIZE,
  AUDIT_MAX_SAMPLE_SIZE,
  AUDIT_SAMPLE_SIZES,
} from "@/lib/constants";
import {
  CARD_TYPES,
  CATEGORIES,
  type CardType,
  type CategorizationMethod,
  type Category,
} from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const AUDITABLE_SOURCES: CategorizationMethod[] = ["source_map", "rule"];
const ALLOWED_CARD_TYPES = CARD_TYPES;

interface AuditSamplePayload {
  sampleSize: number;
  sources: CategorizationMethod[];
  cardType?: CardType;
  category?: Category;
}

function parsePayload(raw: unknown): AuditSamplePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.sampleSize !== "number") return null;
  if (!(AUDIT_SAMPLE_SIZES as readonly number[]).includes(r.sampleSize)) return null;
  if (!Array.isArray(r.sources) || r.sources.length === 0) return null;
  const sources: CategorizationMethod[] = [];
  for (const s of r.sources) {
    if (typeof s !== "string") return null;
    if (!AUDITABLE_SOURCES.includes(s as CategorizationMethod)) return null;
    sources.push(s as CategorizationMethod);
  }
  const out: AuditSamplePayload = { sampleSize: r.sampleSize, sources };
  if (typeof r.cardType === "string") {
    if (!ALLOWED_CARD_TYPES.includes(r.cardType as CardType)) return null;
    out.cardType = r.cardType as CardType;
  }
  if (typeof r.category === "string") {
    if (!(CATEGORIES as readonly string[]).includes(r.category)) return null;
    out.category = r.category as Category;
  }
  return out;
}

interface DisagreementRow {
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
}

interface MatchRow {
  _id: string;
  merchant: string;
  category: Category;
  categorizedBy: CategorizationMethod;
}

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

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("POST /api/transactions/audit/sample JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const payload = parsePayload(body);
    if (!payload) {
      return NextResponse.json(
        {
          error: `Expected { sampleSize: ${AUDIT_SAMPLE_SIZES.join("|")}, sources: ('source_map'|'rule')[], cardType?, category? }`,
        },
        { status: 400 },
      );
    }
    const sampleSize = Math.min(payload.sampleSize, AUDIT_MAX_SAMPLE_SIZE);

    const sample = await sampleTransactionsForAudit({
      userId: session.userId,
      sampleSize,
      sources: payload.sources,
      cardType: payload.cardType,
      category: payload.category,
    });

    if (sample.length === 0) {
      return NextResponse.json({
        summary: { sampled: 0, matches: 0, disagreements: 0, accuracyPct: 0 },
        disagreements: [],
        matches: [],
      });
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

    return NextResponse.json({
      summary: {
        sampled,
        matches: matches.length,
        disagreements: disagreements.length,
        accuracyPct,
      },
      disagreements,
      matches,
    });
  } catch (err) {
    console.error("POST /api/transactions/audit/sample failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to run audit sample";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
