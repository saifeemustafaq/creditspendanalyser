import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  applyAuditCorrection,
  markTransactionsAudited,
} from "@/lib/models/transactions";
import { upsertOverride } from "@/lib/models/category-overrides";
import { normalizeMerchantKey } from "@/lib/services/merchant-normalizer";
import { CATEGORIES, type Category } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type ResolutionAction = "accept_ai" | "keep_current" | "manual" | "skip";

interface Resolution {
  transactionId: string;
  action: ResolutionAction;
  aiCategory: Category;
  merchant: string;
  manualCategory?: Category;
}

interface ResolvePayload {
  resolutions: Resolution[];
  allTransactionIds: string[];
}

function isResolution(v: unknown): v is Resolution {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (typeof r.transactionId !== "string" || !r.transactionId) return false;
  const validActions: ResolutionAction[] = ["accept_ai", "keep_current", "manual", "skip"];
  if (!validActions.includes(r.action as ResolutionAction)) return false;
  if (typeof r.aiCategory !== "string") return false;
  if (!(CATEGORIES as readonly string[]).includes(r.aiCategory)) return false;
  if (typeof r.merchant !== "string") return false;
  if (r.action === "manual") {
    if (typeof r.manualCategory !== "string") return false;
    if (!(CATEGORIES as readonly string[]).includes(r.manualCategory)) return false;
  }
  return true;
}

function parsePayload(raw: unknown): ResolvePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.resolutions) || !Array.isArray(r.allTransactionIds)) return null;
  const resolutions: Resolution[] = [];
  for (const item of r.resolutions) {
    if (!isResolution(item)) return null;
    resolutions.push(item);
  }
  const allTransactionIds: string[] = [];
  for (const id of r.allTransactionIds) {
    if (typeof id !== "string" || !id) return null;
    allTransactionIds.push(id);
  }
  return { resolutions, allTransactionIds };
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("POST /api/transactions/audit/resolve JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const payload = parsePayload(body);
    if (!payload) {
      return NextResponse.json(
        {
          error:
            "Expected { resolutions: [{transactionId, action, aiCategory, merchant}], allTransactionIds: string[] }",
        },
        { status: 400 },
      );
    }

    let corrected = 0;
    const skippedIds = new Set<string>();

    for (const r of payload.resolutions) {
      if (r.action === "skip") {
        skippedIds.add(r.transactionId);
        continue;
      }
      if (r.action === "keep_current") continue;

      const targetCategory = r.action === "manual" ? r.manualCategory! : r.aiCategory;
      const ok = await applyAuditCorrection(session.userId, r.transactionId, targetCategory);
      if (!ok) continue;
      corrected++;
      const key = normalizeMerchantKey(r.merchant);
      if (!key) continue;
      try {
        await upsertOverride({
          userId: session.userId,
          merchantNormalized: key,
          category: targetCategory,
        });
      } catch (err) {
        console.error("POST /api/transactions/audit/resolve upsertOverride failed:", err);
      }
    }

    const idsToMark = payload.allTransactionIds.filter((id) => !skippedIds.has(id));
    await markTransactionsAudited(session.userId, idsToMark);

    const confirmed = payload.resolutions.filter((r) => r.action === "keep_current").length;
    const skipped = skippedIds.size;
    return NextResponse.json({ corrected, confirmed, skipped });
  } catch (err) {
    console.error("POST /api/transactions/audit/resolve failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to apply audit resolutions";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
