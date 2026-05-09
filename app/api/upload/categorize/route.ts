import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { categorizeBatchWithAI, type AIBatchInput } from "@/lib/services/categorizer";
import { AI_CATEGORIZE_BATCH_SIZE } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120;

interface CategorizePayload {
  rows: AIBatchInput[];
}

function isAIBatchInput(v: unknown): v is AIBatchInput {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.merchant === "string" && typeof r.rawDescription === "string";
}

function parsePayload(raw: unknown): CategorizePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const rows = (raw as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return null;
  const cleaned = rows.filter(isAIBatchInput);
  return { rows: cleaned };
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("POST /api/upload/categorize JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const payload = parsePayload(body);
    if (!payload) {
      return NextResponse.json(
        { error: "Expected { rows: [{ merchant, rawDescription }] }" },
        { status: 400 },
      );
    }
    if (payload.rows.length === 0) {
      return NextResponse.json({ results: [] });
    }
    if (payload.rows.length > AI_CATEGORIZE_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Too many rows (max ${AI_CATEGORIZE_BATCH_SIZE} per request)` },
        { status: 400 },
      );
    }

    const results = await categorizeBatchWithAI(payload.rows);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("POST /api/upload/categorize failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to categorize transactions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
