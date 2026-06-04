import type { CardType, Category, CategorizationMethod } from "@/types";

export const DISCOVER_CATEGORY_MAP: Record<string, Category | null> = {
  Restaurants: "Dining",
  Supermarkets: "Groceries",
  Gasoline: "Gas/Fuel",
  "Medical Services": "Healthcare",
  Education: "Education",
  "Payments and Credits": "Payment/Credit",
  "Awards and Rebate Credits": "Rewards",
  "Government Services": "Other",
  // Ambiguous — return null, falls through to regex / AI tiers.
  Merchandise: null,
  Services: null,
  "Travel/ Entertainment": null,
};

export const CHASE_SAPPHIRE_PREFERRED_CATEGORY_MAP: Record<string, Category | null> = {
  "Food & Drink": "Dining",
  Groceries: "Groceries",
  Gas: "Gas/Fuel",
  Shopping: "Shopping",
  Travel: "Travel",
  "Bills & Utilities": "Utilities",
  "Health & Wellness": "Healthcare",
  Entertainment: "Entertainment",
  Education: "Education",
  Home: "Home",
  "Fees & Adjustments": "Fees/Interest",
  // Ambiguous — fall through to regex / AI tiers.
  Personal: null,
  "Professional Services": null,
};

export const AMEX_BCP_CATEGORY_MAP: Record<string, Category | null> = {
  // Merchandise & Supplies
  "Merchandise & Supplies-Groceries": "Groceries",
  "Merchandise & Supplies-Wholesale Stores": "Groceries",
  "Merchandise & Supplies-Department Stores": "Shopping",
  "Merchandise & Supplies-Electronics": "Shopping",
  "Merchandise & Supplies-Clothing": "Shopping",
  "Merchandise & Supplies-Sporting Goods": "Shopping",
  "Merchandise & Supplies-Office Supplies": "Shopping",
  "Merchandise & Supplies-Home Furnishings": "Home",
  "Merchandise & Supplies-Pharmacies": "Healthcare",
  "Merchandise & Supplies-Drug Stores": "Healthcare",
  // Restaurants
  "Restaurant-Restaurant": "Dining",
  "Restaurant-Bar & Café": "Dining",
  "Restaurant-Fast Food": "Dining",
  // Travel
  "Travel-Airline": "Travel",
  "Travel-Hotel": "Travel",
  "Travel-Lodging": "Travel",
  "Travel-Car Rental": "Travel",
  "Travel-Cruise Lines": "Travel",
  "Travel-Parking": "Transportation",
  "Travel-Transportation": "Transportation",
  "Travel-Taxi & Limousines": "Transportation",
  // Gas & Automotive
  "Gas-Automotive": "Gas/Fuel",
  "Automotive-Gas": "Gas/Fuel",
  // Entertainment
  "Entertainment-General": "Entertainment",
  "Entertainment-Movie Theaters": "Entertainment",
  "Entertainment-Sporting Events": "Entertainment",
  // Healthcare
  "Healthcare/Medical-Healthcare/Medical": "Healthcare",
  "Healthcare/Medical-Pharmacy": "Healthcare",
  // Personal
  "Personal Care-Personal Care": "Personal Care",
  // Telecom & Utilities
  "Telecommunications-Cellular": "Phone/Internet",
  "Telecommunications-Internet": "Phone/Internet",
  "Utilities-Electric": "Utilities",
  "Utilities-Gas": "Utilities",
  // Education & Insurance
  "Education-Education": "Education",
  "Insurance-Insurance": "Insurance",
  // Fees & Adjustments (annual fee, interest; cash rewards flow through as credit type so category is irrelevant)
  "Fees & Adjustments-Fees & Adjustments": "Fees/Interest",
  // Ambiguous — fall through to regex / AI tiers
  "Business Services-General": null,
  "Other-Other": null,
};

const ISSUER_CATEGORY_MAPS: Partial<Record<CardType, Record<string, Category | null>>> = {
  discover_it_student: DISCOVER_CATEGORY_MAP,
  chase_sapphire_preferred: CHASE_SAPPHIRE_PREFERRED_CATEGORY_MAP,
  amex_bcp: AMEX_BCP_CATEGORY_MAP,
};

function lookupInMap(
  map: Record<string, Category | null>,
  key: string,
): Category | null {
  if (!(key in map)) return null;
  return map[key] ?? null;
}

export function mapIssuerCategory(
  cardType: CardType,
  sourceCategory: string | null | undefined,
): { category: Category; categorizedBy: CategorizationMethod } | null {
  if (!sourceCategory) return null;
  const key = sourceCategory.trim();

  // Prefer the detected issuer's map. If the detected cardType is wrong (card
  // detection from a CSV body without issuer markers can fall back to "visa"),
  // try the other issuer maps so source categories still resolve.
  const preferred = ISSUER_CATEGORY_MAPS[cardType];
  if (preferred) {
    const hit = lookupInMap(preferred, key);
    if (hit) return { category: hit, categorizedBy: "source_map" };
  }
  for (const [type, map] of Object.entries(ISSUER_CATEGORY_MAPS) as [
    CardType,
    Record<string, Category | null>,
  ][]) {
    if (type === cardType) continue;
    const hit = lookupInMap(map, key);
    if (hit) return { category: hit, categorizedBy: "source_map" };
  }
  return null;
}
