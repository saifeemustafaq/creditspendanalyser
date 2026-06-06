import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { aggregateInsights } from "@/lib/models/transactions";
import { parseDate } from "@/lib/range";
import { CARD_TYPES, CATEGORIES, type CardType, type Category } from "@/types";

export const runtime = "nodejs";

function parseCardType(raw: string | null): CardType | "all" {
  if (!raw || raw === "all") return "all";
  return (CARD_TYPES as readonly string[]).includes(raw) ? (raw as CardType) : "all";
}

function parseCategory(raw: string | null): Category | "all" {
  if (!raw || raw === "all") return "all";
  return (CATEGORIES as readonly string[]).includes(raw) ? (raw as Category) : "all";
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const startDate = parseDate(url.searchParams.get("startDate"));
    const endDate = parseDate(url.searchParams.get("endDate"));
    const cardType = parseCardType(url.searchParams.get("cardType"));
    const category = parseCategory(url.searchParams.get("category"));

    const data = await aggregateInsights({
      userId: session.userId,
      startDate,
      endDate,
      cardType,
      category,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/insights failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
