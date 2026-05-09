import type { ObjectId } from "mongodb";

export type CardType =
  | "visa"
  | "discover_it_student"
  | "amex_bcp"
  | "chase_sapphire_preferred";
export type FileFormat = "pdf" | "csv" | "xls" | "image";
export type TransactionType = "debit" | "credit" | "payment";

export const CARD_LABELS: Record<CardType, string> = {
  visa: "Visa",
  discover_it_student: "Discover IT Student",
  amex_bcp: "Amex Blue Cash Preferred",
  chase_sapphire_preferred: "Chase Sapphire Preferred",
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
