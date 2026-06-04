import type { CardType } from "@/types";

export function detectCardTypeFromText(text: string): CardType | null {
  if (!text) return null;
  const t = text.toLowerCase();

  // Discover IT Student cues first because Discover statements often also contain "Visa" debit hints in retailer rows.
  // Note: Discover CSV exports do not include the word "discover" in the body — detect by the
  // unique "Trans. Date" header (with period; Chase uses "Transaction Date") and "Cashback Bonus" rows.
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
  // Chase Sapphire Preferred — match before the generic "chase" → visa fallback.
  // Markers: filename/content "chase" plus a Sapphire/Chase Travel hint, or
  // the Chase CSV header signature (Type + Memo columns alongside Amount).
  if (
    t.includes("chase") &&
    (t.includes("sapphire") ||
      t.includes("chase travel") ||
      /transaction date,post date,description,category,type,amount,memo/i.test(t))
  ) {
    return "chase_sapphire_preferred";
  }
  if (t.includes("visa") || /chase|bank of america|capital one|wells fargo|citi/.test(t)) {
    return "visa";
  }
  return null;
}
