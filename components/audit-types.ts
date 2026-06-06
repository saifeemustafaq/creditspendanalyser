import type { CardType, CategorizationMethod, Category } from "@/types";

// Re-exported from the service so client components and server code share one definition.
export type {
  DisagreementRow,
  MatchRow,
  AuditSummary,
  AuditSampleResult as AuditResponse,
} from "@/lib/services/audit-service";

export type AuditPhase = "config" | "loading" | "results" | "saving";
export type ResolutionAction = "accept_ai" | "keep_current" | "manual" | "skip";
export type Resolution = {
  action: ResolutionAction;
  manualCategory?: Category;
};
export type AuditableSource = Extract<CategorizationMethod, "source_map" | "rule">;

export const SOURCE_LABELS: Record<AuditableSource, string> = {
  source_map: "Issuer",
  rule: "Rule",
};

// Keep CardType in scope for consumers that import it transitively via this file.
export type { CardType, CategorizationMethod, Category };
