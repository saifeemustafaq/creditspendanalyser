import type {
  CardType,
  CategorizationMethod,
  Category,
} from "@/types";

export type AuditPhase = "config" | "loading" | "results" | "saving";
export type ResolutionAction = "accept_ai" | "keep_current" | "manual" | "skip";
export interface Resolution {
  action: ResolutionAction;
  manualCategory?: Category;
}
export type AuditableSource = Extract<CategorizationMethod, "source_map" | "rule">;

export interface DisagreementRow {
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

export interface MatchRow {
  _id: string;
  merchant: string;
  category: Category;
  categorizedBy: CategorizationMethod;
}

export interface AuditSummary {
  sampled: number;
  matches: number;
  disagreements: number;
  accuracyPct: number;
}

export interface AuditResponse {
  summary: AuditSummary;
  disagreements: DisagreementRow[];
  matches: MatchRow[];
}

export const SOURCE_LABELS: Record<AuditableSource, string> = {
  source_map: "Issuer",
  rule: "Rule",
};
