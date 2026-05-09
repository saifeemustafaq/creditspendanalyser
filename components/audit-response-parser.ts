import {
  CARD_LABELS,
  CATEGORIES,
  type CardType,
  type CategorizationMethod,
  type Category,
} from "@/types";
import type {
  AuditResponse,
  DisagreementRow,
  MatchRow,
} from "./audit-types";

function isCategory(v: unknown): v is Category {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}

function isCardType(v: unknown): v is CardType {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(CARD_LABELS, v);
}

function isCategorizationMethod(v: unknown): v is CategorizationMethod {
  return v === "source_map" || v === "rule" || v === "ai" || v === "user" || v === "user_override";
}

function parseDisagreement(v: unknown): DisagreementRow | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r._id !== "string") return null;
  if (typeof r.transactionDate !== "string") return null;
  if (typeof r.merchant !== "string") return null;
  if (typeof r.rawDescription !== "string") return null;
  if (typeof r.amount !== "number") return null;
  if (!isCardType(r.cardType)) return null;
  if (!isCategory(r.currentCategory)) return null;
  if (!isCategorizationMethod(r.categorizedBy)) return null;
  if (r.sourceCategory !== null && typeof r.sourceCategory !== "string") return null;
  if (!isCategory(r.aiSuggestedCategory)) return null;
  return {
    _id: r._id,
    transactionDate: r.transactionDate,
    merchant: r.merchant,
    rawDescription: r.rawDescription,
    amount: r.amount,
    cardType: r.cardType,
    currentCategory: r.currentCategory,
    categorizedBy: r.categorizedBy,
    sourceCategory: r.sourceCategory,
    aiSuggestedCategory: r.aiSuggestedCategory,
  };
}

function parseMatch(v: unknown): MatchRow | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  if (typeof r._id !== "string") return null;
  if (typeof r.merchant !== "string") return null;
  if (!isCategory(r.category)) return null;
  if (!isCategorizationMethod(r.categorizedBy)) return null;
  return {
    _id: r._id,
    merchant: r.merchant,
    category: r.category,
    categorizedBy: r.categorizedBy,
  };
}

export function parseAuditResponse(raw: unknown): AuditResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const summaryRaw = r.summary;
  if (!summaryRaw || typeof summaryRaw !== "object") return null;
  const s = summaryRaw as Record<string, unknown>;
  if (
    typeof s.sampled !== "number" ||
    typeof s.matches !== "number" ||
    typeof s.disagreements !== "number" ||
    typeof s.accuracyPct !== "number"
  ) {
    return null;
  }
  if (!Array.isArray(r.disagreements) || !Array.isArray(r.matches)) return null;
  const disagreements: DisagreementRow[] = [];
  for (const d of r.disagreements) {
    const parsed = parseDisagreement(d);
    if (!parsed) return null;
    disagreements.push(parsed);
  }
  const matches: MatchRow[] = [];
  for (const m of r.matches) {
    const parsed = parseMatch(m);
    if (!parsed) return null;
    matches.push(parsed);
  }
  return {
    summary: {
      sampled: s.sampled,
      matches: s.matches,
      disagreements: s.disagreements,
      accuracyPct: s.accuracyPct,
    },
    disagreements,
    matches,
  };
}
