import * as XLSX from "xlsx";

export type StructuredRow = {
  transactionDate: string; // "YYYY-MM-DD"
  postDate: string | null; // "YYYY-MM-DD" if present
  description: string; // raw description, multiline preserved (newlines kept)
  amount: number; // raw amount: sign convention varies by issuer — adapters interpret it
  sourceCategory: string | null;
  // Issuer-specific transaction-type column (e.g. Chase: Sale/Payment/Return/Fee/Adjustment).
  // Adapters that have one use it as the authoritative direction signal.
  typeHint: string | null;
  rawFields: Record<string, string>;
};

const DATE_HEADERS = ["trans. date", "transaction date", "trans date", "date", "posted date"];
const POST_DATE_HEADERS = ["post date", "posting date", "posted date"];
const DESC_HEADERS = ["description", "desc", "merchant", "details"];
const AMOUNT_HEADERS = ["amount", "amt", "debit", "transaction amount"];
const CATEGORY_HEADERS = ["category", "cat"];
const TYPE_HEADERS = ["type", "transaction type"];

function findHeader(headers: string[], candidates: string[]): string | null {
  const lc = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const i = lc.indexOf(c);
    if (i !== -1) return headers[i];
  }
  // partial match
  for (const c of candidates) {
    const i = lc.findIndex((h) => h.includes(c));
    if (i !== -1) return headers[i];
  }
  return null;
}

function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // MM/DD/YYYY
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD already
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Fallback: Date.parse
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

function parseAmount(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // Strip $, commas, surrounding quotes/spaces
  let s = trimmed.replace(/[$"]/g, "").replace(/,/g, "").trim();
  // Handle parentheses for negatives
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

export async function parseCsvStructured(buffer: Buffer): Promise<StructuredRow[]> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: "" });
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const dateKey = findHeader(headers, DATE_HEADERS);
  const postDateKey = findHeader(headers, POST_DATE_HEADERS);
  const descKey = findHeader(headers, DESC_HEADERS);
  const amountKey = findHeader(headers, AMOUNT_HEADERS);
  const categoryKey = findHeader(headers, CATEGORY_HEADERS);
  const typeKey = findHeader(headers, TYPE_HEADERS);

  if (!dateKey || !descKey || !amountKey) return [];

  const out: StructuredRow[] = [];
  for (const row of rows) {
    const dateRaw = row[dateKey];
    const transactionDate = parseDate(dateRaw);
    if (!transactionDate) continue;

    const postDate = postDateKey ? parseDate(row[postDateKey]) : null;
    const description = String(row[descKey] ?? "").trim();
    const amount = parseAmount(row[amountKey]);
    if (amount === null) continue;

    const sourceCategory = categoryKey
      ? (String(row[categoryKey] ?? "").trim() || null)
      : null;

    const typeHint = typeKey
      ? (String(row[typeKey] ?? "").trim() || null)
      : null;

    out.push({
      transactionDate,
      postDate,
      description,
      amount,
      sourceCategory,
      typeHint,
      rawFields: row,
    });
  }
  return out;
}
