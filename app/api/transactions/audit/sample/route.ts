import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sampleTransactionsForAudit } from "@/lib/models/transactions";
import { runAuditSample } from "@/lib/services/audit-service";
import { AUDIT_MAX_SAMPLE_SIZE, AUDIT_SAMPLE_SIZES } from "@/lib/constants";
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

type AuditSamplePayload = {
  sampleSize: number;
  sources: CategorizationMethod[];
  cardType?: CardType;
  category?: Category;
};

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

    const result = await runAuditSample(sample);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/transactions/audit/sample failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to run audit sample";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
