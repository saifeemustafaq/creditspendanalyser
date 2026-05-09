import type { CardType, Category } from "@/types";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const TRANSACTIONS_PAGE_SIZE = 50;
export const TRANSACTIONS_MAX_LIMIT = 200;
export const EXPORT_MAX_ROWS = 10_000;
export const BCRYPT_SALT_ROUNDS = 10;
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
export const EXTRACTION_TEXT_LIMIT = 60_000;
export const CARD_DETECTION_TEXT_LIMIT = 8_000;
export const AI_CATEGORIZE_BATCH_SIZE = 50;
export const AUDIT_SAMPLE_SIZES = [25, 50, 100] as const;
export const AUDIT_DEFAULT_SAMPLE_SIZE = 50;
export const AUDIT_MAX_SAMPLE_SIZE = 100;

// 20 distinct hues — one per Category. Hex with no alpha; consumers append
// "1A" (≈10%) for tinted backgrounds via color-mix in CSS or hex8.
export const CATEGORY_COLORS: Record<Category, string> = {
  Groceries: "#16a34a",
  Dining: "#ea580c",
  "Gas/Fuel": "#dc2626",
  Entertainment: "#9333ea",
  Shopping: "#db2777",
  Travel: "#2563eb",
  Subscriptions: "#4f46e5",
  Utilities: "#0891b2",
  Healthcare: "#0d9488",
  Insurance: "#0284c7",
  Education: "#ca8a04",
  "Personal Care": "#e11d48",
  Home: "#a16207",
  Rent: "#475569",
  "Phone/Internet": "#7c3aed",
  Government: "#b45309",
  Transportation: "#65a30d",
  "Fees/Interest": "#be123c",
  "Payment/Credit": "#059669",
  Other: "#6b7280",
};

// Brand-adjacent colors per card issuer.
export const CARD_COLORS: Record<CardType, string> = {
  visa: "#1a1f71",
  discover_it_student: "#ff6000",
  amex_bcp: "#0d9488",
  chase_sapphire_preferred: "#117aca",
};
