const NOISE_LINE_PATTERNS: RegExp[] = [
  /^APPLE\s+PAY\s+ENDING\s+IN\s+\d{4}$/i,
  /^GOOGLE\s+PAY\s+ENDING\s+IN\s+\d{4}$/i,
  /^\d{10,}$/, // pure long numeric reference numbers
  /^\d{14}[A-Z]{0,4}$/i, // alphanumeric reference like 00014354031413901380AA
  /^ITEM\s+TRANSFERRED\s+FROM\s+PREV\s+ACCOUNT$/i,
  /^SECURITY\s+DISPUTE\s+ADJUSTMENT$/i,
];

const PREFIX_PATTERNS: RegExp[] = [
  /^SQ\s*\*\s*/i,
  /^TST\s*\*\s*/i,
  /^DD\s*\*\s*/i,
  /^IC\s*\*\s*/i,
  /^SPO\s*\*\s*/i,
  /^CPY\s*\*\s*/i,
  /^EB\s*\*\s*/i,
  /^FD\s*\*\s*/i,
  /^REG\s+/i,
  /^MS\s+CM\s+/i,
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];
const STATE_TRAILING_RE = new RegExp(
  `\\s+(${US_STATES.join("|")})(\\s+\\d{5}(-\\d{4})?)?$`,
  "i",
);
const PHONE_TRAILING_RE = /\s+(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})$/;

function titleCase(s: string): string {
  return s.replace(/\b([A-Z])([A-Z]*)\b/g, (_, first: string, rest: string) => {
    return first + rest.toLowerCase();
  });
}

export function normalizeMerchant(rawDescription: string): string {
  if (!rawDescription) return "";

  const lines = rawDescription
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      for (const pat of NOISE_LINE_PATTERNS) {
        if (pat.test(l)) return false;
      }
      return true;
    });

  if (lines.length === 0) return "";

  // Use the first surviving line as the merchant string.
  let s = lines[0];

  // Strip prefix
  for (const pat of PREFIX_PATTERNS) {
    if (pat.test(s)) {
      s = s.replace(pat, "");
      break;
    }
  }

  // Trailing phone numbers
  s = s.replace(PHONE_TRAILING_RE, "");

  // Trailing state + optional zip
  s = s.replace(STATE_TRAILING_RE, "");

  // Collapse repeated whitespace
  s = s.replace(/\s+/g, " ").trim();

  return titleCase(s);
}

export function normalizeMerchantKey(rawDescription: string): string {
  return normalizeMerchant(rawDescription).toLowerCase().trim();
}
