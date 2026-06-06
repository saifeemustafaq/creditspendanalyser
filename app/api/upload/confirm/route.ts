import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  confirmAndSave,
  type ConfirmAndSaveArgs,
  type PreviewTransaction,
} from "@/lib/services/extraction-pipeline";
import { FILE_FORMATS } from "@/lib/constants";
import {
  CARD_TYPES,
  CATEGORIES,
  type CardType,
  type CategorizationMethod,
  type Category,
} from "@/types";

const ALLOWED_CARD_TYPES = CARD_TYPES;
const ALLOWED_TYPES = ["debit", "credit", "payment", "reward"] as const;
const ALLOWED_METHODS: CategorizationMethod[] = [
  "source_map",
  "rule",
  "ai",
  "user",
  "user_override",
];

export const runtime = "nodejs";
export const maxDuration = 120;

function asPreviewTransaction(v: unknown): PreviewTransaction | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r.transactionDate !== "string") return null;
  if (typeof r.merchant !== "string") return null;
  if (typeof r.rawDescription !== "string") return null;
  if (typeof r.amount !== "number" || !Number.isFinite(r.amount)) return null;
  const type = r.type;
  if (typeof type !== "string" || !(ALLOWED_TYPES as readonly string[]).includes(type)) return null;
  const category = r.category;
  if (typeof category !== "string" || !(CATEGORIES as readonly string[]).includes(category)) {
    return null;
  }
  const categorizedBy = r.categorizedBy;
  if (typeof categorizedBy !== "string" || !ALLOWED_METHODS.includes(categorizedBy as CategorizationMethod)) {
    return null;
  }
  return {
    transactionDate: r.transactionDate,
    postDate: typeof r.postDate === "string" ? r.postDate : null,
    merchant: r.merchant,
    amount: r.amount,
    type: type as PreviewTransaction["type"],
    rawDescription: r.rawDescription,
    sourceCategory: typeof r.sourceCategory === "string" ? r.sourceCategory : null,
    category: category as Category,
    categorizedBy: categorizedBy as CategorizationMethod,
  };
}

function parseConfirmBody(raw: unknown, userId: string): ConfirmAndSaveArgs | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const cardType = r.cardType;
  const fileFormat = r.fileFormat;
  if (typeof cardType !== "string" || !ALLOWED_CARD_TYPES.includes(cardType as CardType)) return null;
  if (typeof fileFormat !== "string" || !(FILE_FORMATS as readonly string[]).includes(fileFormat)) {
    return null;
  }
  const originalFilename = typeof r.originalFilename === "string" ? r.originalFilename : "statement";
  const statementDate = typeof r.statementDate === "string" ? r.statementDate : null;
  const txArr = Array.isArray(r.transactions) ? r.transactions : null;
  if (!txArr) return null;
  const transactions: PreviewTransaction[] = [];
  for (const item of txArr) {
    const tx = asPreviewTransaction(item);
    if (!tx) return null;
    transactions.push(tx);
  }
  return {
    userId,
    cardType: cardType as CardType,
    fileFormat: fileFormat as ConfirmAndSaveArgs["fileFormat"],
    originalFilename,
    statementDate,
    transactions,
  };
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("POST /api/upload/confirm JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const args = parseConfirmBody(body, session.userId);
    if (!args) {
      return NextResponse.json(
        { error: "Invalid confirm payload" },
        { status: 400 },
      );
    }

    const result = await confirmAndSave(args);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/upload/confirm failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to save transactions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
