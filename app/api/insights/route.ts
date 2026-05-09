import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { aggregateInsights } from "@/lib/models/transactions";
import type { CardType, Category } from "@/types";

export const runtime = "nodejs";

function parseDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const startDate = parseDate(url.searchParams.get("startDate"));
    const endDate = parseDate(url.searchParams.get("endDate"));
    const cardType = (url.searchParams.get("cardType") as CardType | "all" | null) ?? "all";
    const category = (url.searchParams.get("category") as Category | "all" | null) ?? "all";

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
