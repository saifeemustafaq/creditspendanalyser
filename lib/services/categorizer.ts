import {
  CATEGORIES,
  type CardType,
  type Category,
  type CategorizationMethod,
  type ExtractedTransaction,
} from "@/types";
import { EXTRACTION_MODEL, getOpenAI } from "@/lib/openai";
import { mapIssuerCategory } from "@/lib/services/category-mapper";
import { normalizeMerchantKey } from "@/lib/services/merchant-normalizer";

const MERCHANT_RULES: Array<{ match: RegExp; category: Category }> = [
  // Costco Gas must be checked before the broad Costco → Groceries rule below.
  { match: /costco\s*(gas|gasoline|fuel)/i, category: "Gas/Fuel" },
  { match: /walmart|target|costco|aldi|kroger|safeway|whole\s*foods|trader\s*joe|publix|wegmans|heb/i, category: "Groceries" },
  // Uber Eats must be checked before the broad Uber → Transportation rule below.
  { match: /ubereats|uber\s*eats|grubhub|doordash|postmates/i, category: "Dining" },
  { match: /mcdonald|starbucks|chipotle|chick-?fil-?a|panera|subway|taco\s*bell|burger\s*king|wendy|kfc|domino|pizza|restaurant|cafe|coffee/i, category: "Dining" },
  { match: /shell|chevron|exxon|mobil|bp\s*gas|76\s*gas|sunoco|valero|arco|gas\s*station/i, category: "Gas/Fuel" },
  { match: /netflix|spotify|hulu|disney\+|hbo|apple\s*music|apple\s*tv|prime\s*video|youtube\s*premium|paramount|peacock/i, category: "Subscriptions" },
  { match: /amazon|ebay|etsy|best\s*buy|wayfair|home\s*depot|lowe|ikea|macys|nordstrom|kohls|tj\s*maxx|marshalls/i, category: "Shopping" },
  { match: /uber|lyft|taxi|metro|transit|amtrak|mta|bart|caltrain/i, category: "Transportation" },
  { match: /delta|united|american\s*airlines|southwest|jetblue|alaska\s*air|hotel|marriott|hilton|airbnb|expedia|booking\.com|kayak/i, category: "Travel" },
  { match: /pg&?e|water|electric|gas\s*company|utility/i, category: "Utilities" },
  { match: /us\s*mobile|t-?mobile|at&?t|verizon|comcast|xfinity|spectrum|cricket|boost\s*mobile|visible/i, category: "Phone/Internet" },
  { match: /rent\s*track|campus\s*living|zillow\s*rent|avail\s*rent/i, category: "Rent" },
  { match: /uscis|dmv|irs\s|state\s*tax|city\s*tax|passport|immigration/i, category: "Government" },
  { match: /cvs|walgreens|rite\s*aid|pharmacy|hospital|clinic|dental|doctor|medical/i, category: "Healthcare" },
  { match: /geico|state\s*farm|allstate|progressive|insurance/i, category: "Insurance" },
  { match: /tuition|university|college|coursera|udemy|edx|school/i, category: "Education" },
  { match: /sephora|ulta|salon|barber|spa/i, category: "Personal Care" },
  { match: /movie|cinema|amc|regal|theatre|theater|concert|ticket|playstation|xbox|nintendo|steam|gym|fitness/i, category: "Entertainment" },
  { match: /interest\s*charge|finance\s*charge|late\s*fee|annual\s*fee|service\s*fee/i, category: "Fees/Interest" },
  { match: /payment\s*-?\s*thank\s*you|autopay|online\s*payment/i, category: "Payment/Credit" },
];

export function categorizeMerchantRule(merchant: string, rawDescription = ""): Category | null {
  const combined = `${merchant} ${rawDescription}`;
  for (const rule of MERCHANT_RULES) {
    if (rule.match.test(combined)) return rule.category;
  }
  return null;
}

export type CategorizedTx = ExtractedTransaction & {
  category: Category;
  categorizedBy: CategorizationMethod;
};

interface CategoryResultRow {
  index: number;
  category: string;
}

function isCategoryResultRow(value: unknown): value is CategoryResultRow {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.index === "number" && typeof v.category === "string";
}

function parseCategorizerResponse(content: string): CategoryResultRow[] {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    console.error("Categorizer LLM response was not valid JSON:", err);
    return [];
  }
  if (!raw || typeof raw !== "object") return [];
  const results = (raw as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  return results.filter(isCategoryResultRow);
}

export interface CategorizeOptions {
  overrideMap?: Map<string, Category>;
  cardType?: CardType;
}

/**
 * Tiered categorization (no AI). Applies, in order:
 *   0. payment/credit type → "Payment/Credit"
 *   1. user override map (Tier 0)
 *   2. issuer source category mapping (Tier 1)
 *   3. regex merchant rules (Tier 2)
 *   4. fallback "Other" with categorizedBy="rule"
 *
 * AI categorization is intentionally NOT called here — see `categorizeBatchWithAI()`.
 */
export function categorizeTransactions(
  txs: ExtractedTransaction[],
  opts: CategorizeOptions = {},
): CategorizedTx[] {
  const overrideMap = opts.overrideMap;
  const cardType = opts.cardType;
  return txs.map((tx) => {
    if (tx.type === "reward") {
      return { ...tx, category: "Rewards", categorizedBy: "rule" };
    }
    if (tx.type === "payment" || tx.type === "credit") {
      return { ...tx, category: "Payment/Credit", categorizedBy: "rule" };
    }

    if (overrideMap && overrideMap.size > 0) {
      const key = normalizeMerchantKey(tx.merchant ?? tx.rawDescription ?? "");
      if (key) {
        const hit = overrideMap.get(key);
        if (hit) {
          // If the raw description signals a more specific category (e.g. "Costco GAS"
          // while the override has "Costco" → Groceries), trust the regex so that
          // broad merchant overrides don't accidentally swallow sub-type transactions.
          const specificRuleHit = categorizeMerchantRule(tx.merchant ?? "", tx.rawDescription ?? "");
          if (specificRuleHit && specificRuleHit !== hit) {
            return { ...tx, category: specificRuleHit, categorizedBy: "rule" };
          }
          return { ...tx, category: hit, categorizedBy: "user_override" };
        }

        // Word-boundary prefix fallback: "apni mandi" hits "apni mandi farmers marke sunnyvale"
        // and vice versa, without risking "shell" matching "shellfish".
        for (const [storedKey, storedCategory] of overrideMap) {
          if (storedKey.startsWith(key + " ") || key.startsWith(storedKey + " ")) {
            const specificRuleHit = categorizeMerchantRule(tx.merchant ?? "", tx.rawDescription ?? "");
            if (specificRuleHit && specificRuleHit !== storedCategory) {
              return { ...tx, category: specificRuleHit, categorizedBy: "rule" };
            }
            return { ...tx, category: storedCategory, categorizedBy: "user_override" };
          }
        }
      }
    }

    const sourceMatch = cardType
      ? mapIssuerCategory(cardType, tx.sourceCategory ?? null)
      : null;
    if (sourceMatch) {
      return { ...tx, category: sourceMatch.category, categorizedBy: sourceMatch.categorizedBy };
    }

    const ruleHit = categorizeMerchantRule(tx.merchant ?? "", tx.rawDescription ?? "");
    if (ruleHit) {
      return { ...tx, category: ruleHit, categorizedBy: "rule" };
    }

    return { ...tx, category: "Other", categorizedBy: "rule" };
  });
}

export interface AIBatchInput {
  merchant: string;
  rawDescription: string;
}

export interface AIBatchResult {
  index: number;
  category: Category;
}

export async function categorizeBatchWithAI(
  rows: AIBatchInput[],
): Promise<AIBatchResult[]> {
  if (rows.length === 0) return [];

  // Deduplicate by normalized merchant so the AI only sees each unique merchant once.
  // This reduces tokens and eliminates inconsistency on identical merchants.
  const keyToUniqueIdx = new Map<string, number>();
  const uniqueRows: AIBatchInput[] = [];
  const originalToUnique: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const key = normalizeMerchantKey(rows[i].merchant) || `__raw_${i}`;
    const existing = keyToUniqueIdx.get(key);
    if (existing !== undefined) {
      originalToUnique.push(existing);
    } else {
      const uid = uniqueRows.length;
      keyToUniqueIdx.set(key, uid);
      uniqueRows.push(rows[i]);
      originalToUnique.push(uid);
    }
  }

  const openai = getOpenAI();
  const prompt = `You are categorizing credit card transactions. Allowed categories (use EXACTLY one of these): ${CATEGORIES.join(
    ", ",
  )}.\n\nFor each row, respond with the category that best fits. Reply ONLY with valid JSON of the form:\n{"results":[{"index":0,"category":"Groceries"}, ...]}\n\nRows:\n${uniqueRows
    .map((r, i) => `${i}. merchant="${r.merchant}" desc="${r.rawDescription}"`)
    .join("\n")}`;
  const res = await openai.chat.completions.create({
    model: EXTRACTION_MODEL,
    messages: [
      { role: "system", content: "You output strict JSON. No prose." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });
  const content = res.choices[0]?.message?.content ?? "{}";

  // Parse AI results keyed by unique index.
  const uniqueResults = new Map<number, Category>();
  for (const row of parseCategorizerResponse(content)) {
    if (row.index < 0 || row.index >= uniqueRows.length) continue;
    const cat = (CATEGORIES as readonly string[]).includes(row.category)
      ? (row.category as Category)
      : "Other";
    uniqueResults.set(row.index, cat);
  }

  // Fan results back out to all original indices.
  const out: AIBatchResult[] = [];
  for (let i = 0; i < rows.length; i++) {
    const uid = originalToUnique[i];
    const cat = uniqueResults.get(uid);
    if (cat !== undefined) {
      out.push({ index: i, category: cat });
    }
  }
  return out;
}
