import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listTransactions } from "@/lib/models/transactions";
import { buildTransactionsCsv, buildTransactionsPdf } from "@/lib/services/export-service";
import { EXPORT_MAX_ROWS } from "@/lib/constants";
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
    const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";
    const startDate = parseDate(url.searchParams.get("startDate"));
    const endDate = parseDate(url.searchParams.get("endDate"));

    const { rows } = await listTransactions(
      {
        userId: session.userId,
        startDate,
        endDate,
        cardType: parseCardType(url.searchParams.get("cardType")),
        category: parseCategory(url.searchParams.get("category")),
      },
      { limit: EXPORT_MAX_ROWS },
    );

    if (format === "csv") {
      return new NextResponse(buildTransactionsCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="transactions-${Date.now()}.csv"`,
        },
      });
    }

    const buf = buildTransactionsPdf({ rows, startDate, endDate });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="transactions-${Date.now()}.pdf"`,
      },
    });
  } catch (err) {
    console.error("GET /api/export failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
