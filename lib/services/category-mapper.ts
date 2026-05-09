import type { CardType, Category, CategorizationMethod } from "@/types";

export const DISCOVER_CATEGORY_MAP: Record<string, Category | null> = {
  Restaurants: "Dining",
  Supermarkets: "Groceries",
  Gasoline: "Gas/Fuel",
  "Medical Services": "Healthcare",
  Education: "Education",
  "Payments and Credits": "Payment/Credit",
  "Awards and Rebate Credits": "Payment/Credit",
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

const ISSUER_CATEGORY_MAPS: Partial<Record<CardType, Record<string, Category | null>>> = {
  discover_it_student: DISCOVER_CATEGORY_MAP,
  chase_sapphire_preferred: CHASE_SAPPHIRE_PREFERRED_CATEGORY_MAP,
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
