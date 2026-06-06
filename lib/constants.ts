import type { CardType, Category, RecurringFrequency } from "@/types";

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
  Rewards: "#f59e0b",
  Other: "#6b7280",
};

// Brand-adjacent colors per card issuer.
export const CARD_COLORS: Record<CardType, string> = {
  visa: "#1a1f71",
  discover_it_student: "#ff6000",
  amex_bcp: "#0d9488",
  chase_sapphire_preferred: "#117aca",
  robinhood_gold: "#00c805",
};

// Per-summary-card accent colors used on the dashboard's left-border accents.
export const SUMMARY_ACCENT = {
  spend: "#2563eb",
  count: "#059669",
  positive: "#059669",
  negative: "#d97706",
  neutral: "#6b7280",
} as const;

// --- Recurring transaction detection ---
export const RECURRING_MIN_OCCURRENCES = 2;
export const RECURRING_AMOUNT_TOLERANCE = 0.1; // 10% same-cluster band
export const RECURRING_VARIABLE_THRESHOLD = 0.4; // stddev/mean above this rejects unless intervals are regular
export const RECURRING_CONFIDENCE_MIN = 0.3; // below this, drop the candidate
export const RECURRING_GRACE_PERIOD_MULTIPLIER = 1.5; // 1.5x interval before "possibly_cancelled"
export const RECURRING_PRICE_DELTA_ALERT = 0.05; // 5% delta last-vs-prev triggers price_*_alert
export const RECURRING_UNUSUAL_STDDEV_MULT = 2; // > 2σ from mean = unusual_amount alert

export const FREQUENCY_WINDOWS: Record<
  RecurringFrequency,
  { min: number; max: number; multiplier: number }
> = {
  weekly: { min: 5, max: 9, multiplier: 52 },
  "bi-weekly": { min: 12, max: 16, multiplier: 26 },
  monthly: { min: 26, max: 35, multiplier: 12 },
  quarterly: { min: 80, max: 100, multiplier: 4 },
  "semi-annual": { min: 170, max: 200, multiplier: 2 },
  annual: { min: 350, max: 380, multiplier: 1 },
};

// Single source of truth for the frequency list. Used by detector windowing,
// API validation, and UI dropdowns — do not redeclare elsewhere.
export const RECURRING_FREQUENCIES = Object.keys(
  FREQUENCY_WINDOWS,
) as RecurringFrequency[];

// Recurring detector scoring weights (kept here so server + tests reference
// the same values; tune in one place).
export const RECURRING_INTERVAL_CV_REJECT = 0.4; // rejection threshold when amount variance is also high
export const RECURRING_INTERVAL_BONUS_WEIGHT = 0.3;
export const RECURRING_AMOUNT_BONUS_WEIGHT = 0.2;
export const RECURRING_BASE_SCORE_DIVISOR = 4;
