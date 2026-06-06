import type { ObjectId } from "mongodb";

export type CardType =
  | "visa"
  | "discover_it_student"
  | "amex_bcp"
  | "chase_sapphire_preferred"
  | "chase_prime_visa"
  | "robinhood_gold";
export type FileFormat = "pdf" | "csv" | "xls" | "image";
export type TransactionType = "debit" | "credit" | "payment" | "reward";

export const CARD_LABELS: Record<CardType, string> = {
  visa: "Visa",
  discover_it_student: "Discover IT Student",
  amex_bcp: "Amex Blue Cash Preferred",
  chase_sapphire_preferred: "Chase Sapphire Preferred",
  chase_prime_visa: "Chase Prime Visa Signature",
  robinhood_gold: "Robinhood Gold Card",
};

export const CARD_TYPES = Object.keys(CARD_LABELS) as CardType[];

export const CATEGORIES = [
  "Groceries",
  "Dining",
  "Gas/Fuel",
  "Entertainment",
  "Shopping",
  "Travel",
  "Subscriptions",
  "Utilities",
  "Healthcare",
  "Insurance",
  "Education",
  "Personal Care",
  "Home",
  "Rent",
  "Phone/Internet",
  "Government",
  "Transportation",
  "Fees/Interest",
  "Payment/Credit",
  "Rewards",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type CategorizationMethod =
  | "source_map"
  | "rule"
  | "ai"
  | "user"
  | "user_override";

export type DiscoverCategory =
  | "Restaurants"
  | "Supermarkets"
  | "Gasoline"
  | "Medical Services"
  | "Education"
  | "Payments and Credits"
  | "Awards and Rebate Credits"
  | "Government Services"
  | "Merchandise"
  | "Services"
  | "Travel/ Entertainment";

export interface UserDoc {
  _id: ObjectId;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UploadStats {
  rowsParsed: number;
  rowsSaved: number;
  /** Omitted on statements uploaded before dedupe support. */
  rowsSkippedDuplicate?: number;
  rowsSkippedInFile?: number;
  categorization: Partial<Record<CategorizationMethod, number>>;
  uncategorized: number;
}

export interface StatementDoc {
  _id: ObjectId;
  userId: ObjectId;
  cardType: CardType;
  originalFilename: string;
  fileFormat: FileFormat;
  statementDate: Date | null;
  uploadedAt: Date;
  transactionCount: number;
  totalAmount: number;
  uploadStats?: UploadStats;
}

export interface TransactionDoc {
  _id: ObjectId;
  statementId: ObjectId;
  userId: ObjectId;
  cardType: CardType;
  transactionDate: Date;
  postDate: Date | null;
  merchant: string;
  category: Category;
  amount: number;
  type: TransactionType;
  rawDescription: string;
  // Optional — older docs won't have these fields. Code must tolerate undefined.
  sourceCategory?: string | null;
  categorizedBy?: CategorizationMethod;
  lastAuditedAt?: Date;
  dedupeKey?: string;
}

export interface ExtractedTransaction {
  transactionDate: string;
  postDate?: string | null;
  merchant: string;
  amount: number;
  type: TransactionType;
  rawDescription: string;
  sourceCategory?: string | null;
}

export interface CategoryOverrideDoc {
  _id: ObjectId;
  userId: ObjectId;
  merchantNormalized: string;
  category: Category;
  createdAt: Date;
}

export interface SessionPayload {
  userId: string;
  username: string;
}

export type RecurringFrequency =
  | "weekly"
  | "bi-weekly"
  | "monthly"
  | "quarterly"
  | "semi-annual"
  | "annual";

export type RecurringStatus = "active" | "possibly_cancelled" | "new";

export type RecurringOverrideAction = "include" | "dismiss" | "frequency_override";

export interface RecurringOverrideDoc {
  _id: ObjectId;
  userId: ObjectId;
  merchant: string;
  type: TransactionType;
  action: RecurringOverrideAction;
  frequency?: RecurringFrequency;
  customNote?: string;
  createdAt: Date;
}

export interface RecurringItem {
  /** Stable row id (merchant + type + amount cluster + first seen). */
  id: string;
  merchant: string;
  averageAmount: number;
  lastAmount: number;
  frequency: RecurringFrequency;
  confidence: number;
  transactionCount: number;
  firstSeen: string;
  lastSeen: string;
  nextExpected: string | null;
  type: TransactionType;
  category: Category;
  status: RecurringStatus;
  isVariable: boolean;
  amountStdDev: number;
  totalAnnualCost: number;
  userOverride?: RecurringOverrideAction;
}

export type RecurringAlertType =
  | "price_increase"
  | "price_decrease"
  | "possibly_cancelled"
  | "new_detected"
  | "unusual_amount";

export interface RecurringAlert {
  merchant: string;
  type: RecurringAlertType;
  message: string;
  severity: "info" | "warning";
  detectedAt: string;
}

export interface RecurringSummary {
  totalMonthlyRecurring: number;
  totalAnnualRecurring: number;
  activeCount: number;
  alerts: RecurringAlert[];
  items: RecurringItem[];
}
