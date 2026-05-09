import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  listTransactions,
  updateCategoryById,
  updateCategoryByMerchant,
} from "@/lib/models/transactions";
import { upsertOverride } from "@/lib/models/category-overrides";
import { normalizeMerchantKey } from "@/lib/services/merchant-normalizer";
import { TRANSACTIONS_MAX_LIMIT, TRANSACTIONS_PAGE_SIZE } from "@/lib/constants";
import { CATEGORIES, type CardType, type Category } from "@/types";

export const runtime = "nodejs";

function parseDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseNumber(s: string | null): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.min(
      parseNumber(url.searchParams.get("limit")) ?? TRANSACTIONS_PAGE_SIZE,
      TRANSACTIONS_MAX_LIMIT,
    );
    const skip = parseNumber(url.searchParams.get("skip")) ?? 0;

    const { rows, total } = await listTransactions(
      {
        userId: session.userId,
        startDate: parseDate(url.searchParams.get("startDate")),
        endDate: parseDate(url.searchParams.get("endDate")),
        cardType: (url.searchParams.get("cardType") as CardType | "all" | null) ?? "all",
        category: (url.searchParams.get("category") as Category | "all" | null) ?? "all",
        minAmount: parseNumber(url.searchParams.get("minAmount")),
        maxAmount: parseNumber(url.searchParams.get("maxAmount")),
        search: url.searchParams.get("search") ?? undefined,
        statementId: url.searchParams.get("statementId") ?? undefined,
      },
      { limit, skip },
    );

    return NextResponse.json({ rows, total });
  } catch (err) {
    console.error("GET /api/transactions failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface PatchPayload {
  scope: "single" | "merchant";
  category: Category;
  transactionId?: string;
  merchant?: string;
}

function parsePatchPayload(raw: unknown): PatchPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.scope !== "single" && r.scope !== "merchant") return null;
  if (typeof r.category !== "string") return null;
  if (!(CATEGORIES as readonly string[]).includes(r.category)) return null;
  const out: PatchPayload = { scope: r.scope, category: r.category as Category };
  if (r.scope === "single") {
    if (typeof r.transactionId !== "string" || !r.transactionId) return null;
    out.transactionId = r.transactionId;
  } else {
    if (typeof r.merchant !== "string" || !r.merchant.trim()) return null;
    out.merchant = r.merchant;
  }
  return out;
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("PATCH /api/transactions JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const payload = parsePatchPayload(body);
    if (!payload) {
      return NextResponse.json(
        {
          error:
            "Expected { scope: 'single'|'merchant', category, transactionId? | merchant? }",
        },
        { status: 400 },
      );
    }

    if (payload.scope === "single" && payload.transactionId) {
      const ok = await updateCategoryById(
        session.userId,
        payload.transactionId,
        payload.category,
      );
      if (!ok) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      return NextResponse.json({ updated: 1 });
    }

    const merchant = payload.merchant ?? "";
    const updated = await updateCategoryByMerchant(
      session.userId,
      merchant,
      payload.category,
    );
    const key = normalizeMerchantKey(merchant);
    if (key) {
      try {
        await upsertOverride({
          userId: session.userId,
          merchantNormalized: key,
          category: payload.category,
        });
      } catch (err) {
        console.error("PATCH /api/transactions upsertOverride failed:", err);
      }
    }
    return NextResponse.json({ updated });
  } catch (err) {
    console.error("PATCH /api/transactions failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
