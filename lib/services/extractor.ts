import { EXTRACTION_MODEL, getOpenAI } from "@/lib/openai";
import { CARD_DETECTION_TEXT_LIMIT, EXTRACTION_TEXT_LIMIT } from "@/lib/constants";
import type { CardType, ExtractedTransaction, TransactionType } from "@/types";
import { CARD_LABELS } from "@/types";

const CARD_PROMPT_HINTS: Record<CardType, string> = {
  visa:
    "This is a Visa credit card statement. Statements usually have columns: Trans Date, Post Date, Description, Amount. Negative amounts (or 'CR') are payments/credits.",
  discover_it_student:
    "This is a Discover IT Student card statement. Look for Trans Date, Post Date, Description, Amount. Discover statements often include 'Cashback Bonus' rows — those are rewards, NOT spending; mark them type=credit.",
  amex_bcp:
    "This is an American Express Blue Cash Preferred statement. Columns: Date, Description, Amount. Payments appear as negative amounts. Membership rewards are not spending — mark as credit.",
  chase_sapphire_preferred:
    "This is a Chase Sapphire Preferred statement. Columns: Transaction Date, Post Date, Description, Category, Type, Amount, Memo. The Type column is authoritative: Sale=purchase (debit), Payment=payment to card, Return=refund (credit), Fee=debit, Adjustment=use sign. Amounts are negative for purchases/fees and positive for payments/returns; always store amount as POSITIVE and encode direction in 'type'.",
};

const SYSTEM = `You extract credit card transactions from statements into strict JSON.
Output schema:
{
  "transactions": [
    {
      "transactionDate": "YYYY-MM-DD",
      "postDate": "YYYY-MM-DD" | null,
      "merchant": "short merchant name",
      "amount": number (positive for purchases/debits, positive for payments/credits — encode direction in 'type'),
      "type": "debit" | "credit" | "payment",
      "rawDescription": "verbatim description from statement"
    }
  ],
  "statementDate": "YYYY-MM-DD" | null
}
Rules:
- Use 'debit' for purchases, 'payment' for payments to the card, 'credit' for refunds, returns, or rewards.
- Always store 'amount' as a POSITIVE number; the sign comes from 'type'.
- Skip header rows, total/subtotal rows, and informational text.
- If no transactions can be found, return {"transactions":[],"statementDate":null}.
- Output ONLY JSON, no prose.`;

export interface ExtractionResult {
  transactions: ExtractedTransaction[];
  statementDate: Date | null;
}

function coerceJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Extractor JSON parse failed; trying fenced block fallback:", err);
    const m = text.match(/```(?:json)?\s*([\s\S]+?)```/i);
    if (m) {
      try {
        return JSON.parse(m[1]);
      } catch (innerErr) {
        console.error("Extractor fenced JSON parse failed:", innerErr);
      }
    }
    return null;
  }
}

function sanitize(parsed: unknown): ExtractionResult {
  const out: ExtractionResult = { transactions: [], statementDate: null };
  if (!parsed || typeof parsed !== "object") return out;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.statementDate === "string") {
    const d = new Date(obj.statementDate);
    if (!Number.isNaN(d.getTime())) out.statementDate = d;
  }
  const txs = Array.isArray(obj.transactions) ? obj.transactions : [];
  for (const t of txs) {
    if (!t || typeof t !== "object") continue;
    const tx = t as Record<string, unknown>;
    const amountRaw = tx.amount;
    const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);
    if (!Number.isFinite(amount)) continue;
    const type = (tx.type === "credit" || tx.type === "payment" ? tx.type : "debit") as TransactionType;
    const transactionDate = typeof tx.transactionDate === "string" ? tx.transactionDate : null;
    if (!transactionDate) continue;
    out.transactions.push({
      transactionDate,
      postDate: typeof tx.postDate === "string" ? tx.postDate : null,
      merchant: String(tx.merchant ?? "").trim() || "Unknown",
      amount: Math.abs(amount),
      type,
      rawDescription: String(tx.rawDescription ?? tx.description ?? "").trim(),
    });
  }
  return out;
}

export async function extractFromText(
  cardType: CardType,
  text: string,
): Promise<ExtractionResult> {
  const openai = getOpenAI();
  const userMsg = `${CARD_PROMPT_HINTS[cardType]}\n\nStatement text:\n"""\n${text.slice(0, EXTRACTION_TEXT_LIMIT)}\n"""`;
  const res = await openai.chat.completions.create({
    model: EXTRACTION_MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  return sanitize(coerceJson(content));
}

export async function extractFromImage(
  cardType: CardType,
  imageDataUrl: string,
): Promise<ExtractionResult> {
  const openai = getOpenAI();
  const userText = `${CARD_PROMPT_HINTS[cardType]}\n\nExtract every transaction visible in this statement image and return strict JSON per the schema.`;
  const res = await openai.chat.completions.create({
    model: EXTRACTION_MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  return sanitize(coerceJson(content));
}

export async function detectCardTypeViaLLM(text: string): Promise<CardType | null> {
  const openai = getOpenAI();
  const labels = Object.entries(CARD_LABELS)
    .map(([k, v]) => `${k} = ${v}`)
    .join("; ");
  const allowedKeys = Object.keys(CARD_LABELS).join(" | ");
  const res = await openai.chat.completions.create({
    model: EXTRACTION_MODEL,
    messages: [
      {
        role: "system",
        content: `Classify the credit card statement. Allowed values: ${labels}. Reply ONLY with the key (${allowedKeys}). If unclear, reply 'visa'.`,
      },
      { role: "user", content: text.slice(0, CARD_DETECTION_TEXT_LIMIT) },
    ],
    temperature: 0,
  });
  const raw = (res.choices[0]?.message?.content ?? "").trim().toLowerCase();
  if (raw.includes("discover")) return "discover_it_student";
  if (raw.includes("amex") || raw.includes("american") || raw.includes("blue cash")) return "amex_bcp";
  if (raw.includes("chase") || raw.includes("sapphire")) return "chase_sapphire_preferred";
  if (raw.includes("visa") || raw === "visa") return "visa";
  return null;
}
