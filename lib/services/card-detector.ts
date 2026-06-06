import type { CardType } from "@/types";

// Both Chase card CSVs share the same column header; use the filename to tell them apart.
const CHASE_CSV_HEADER = /transaction date,post date,description,category,type,amount,memo/i;

export function detectCardTypeFromText(text: string, filename?: string): CardType | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const f = (filename ?? "").toLowerCase();

  // Discover IT Student — unique "Trans. Date" header (with period) and "Cashback Bonus" rows.
  if (
    t.includes("cashback bonus") ||
    t.includes("discover it student") ||
    t.includes("discover card") ||
    t.includes("trans. date,description,amount,category") ||
    (t.includes("discover") && (t.includes("cashback") || t.includes("it student")))
  ) {
    return "discover_it_student";
  }

  if (
    t.includes("american express") ||
    t.includes("blue cash preferred") ||
    /amex/.test(t) ||
    /membership rewards/.test(t) ||
    t.includes("appears on your statement as")
  ) {
    return "amex_bcp";
  }

  // Robinhood Gold Card — uniquely has a "Cardholder" column (authorized-user support).
  if (t.includes("cardholder") && t.includes("points")) {
    return "robinhood_gold";
  }

  // Chase cards share the same CSV column header. Distinguish by filename first,
  // then fall back to content hints (sapphire in body) if filename is ambiguous.
  // Neither Chase CSV embeds the bank name in the body, so do NOT require "chase" here.
  if (CHASE_CSV_HEADER.test(t) || t.includes("sapphire") || t.includes("chase travel")) {
    // Prime Visa: filename contains "prime" or Amazon-branded hint
    if (f.includes("prime") || t.includes("prime visa") || t.includes("amazon")) {
      return "chase_prime_visa";
    }
    return "chase_sapphire_preferred";
  }

  if (t.includes("visa") || /chase|bank of america|capital one|wells fargo|citi/.test(t)) {
    return "visa";
  }
  return null;
}
