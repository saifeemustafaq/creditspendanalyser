import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { RECURRING_FREQUENCIES } from "@/lib/constants";
import {
  deleteRecurringOverride,
  merchantExistsForUser,
  upsertRecurringOverride,
} from "@/lib/models/recurring";
import type {
  RecurringFrequency,
  RecurringOverrideAction,
  TransactionType,
} from "@/types";

export const runtime = "nodejs";

const VALID_ACTIONS: ReadonlyArray<RecurringOverrideAction> = [
  "include",
  "dismiss",
  "frequency_override",
];
const VALID_TYPES: ReadonlyArray<TransactionType> = ["debit", "credit", "payment"];
const VALID_FREQUENCIES = RECURRING_FREQUENCIES;

interface OverridePostBody {
  merchant: string;
  type: TransactionType;
  action: RecurringOverrideAction;
  frequency?: RecurringFrequency;
  customNote?: string;
}

interface OverrideDeleteBody {
  merchant: string;
  type: TransactionType;
}

function parsePost(raw: unknown): OverridePostBody | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.merchant !== "string" || r.merchant.trim() === "") return null;
  if (typeof r.type !== "string" || !VALID_TYPES.includes(r.type as TransactionType)) {
    return null;
  }
  if (typeof r.action !== "string" || !VALID_ACTIONS.includes(r.action as RecurringOverrideAction)) {
    return null;
  }
  const action = r.action as RecurringOverrideAction;
  let frequency: RecurringFrequency | undefined;
  if (action === "frequency_override") {
    if (typeof r.frequency !== "string" || !VALID_FREQUENCIES.includes(r.frequency as RecurringFrequency)) {
      return null;
    }
    frequency = r.frequency as RecurringFrequency;
  } else if (typeof r.frequency === "string" && VALID_FREQUENCIES.includes(r.frequency as RecurringFrequency)) {
    frequency = r.frequency as RecurringFrequency;
  }
  const customNote = typeof r.customNote === "string" ? r.customNote : undefined;
  return {
    merchant: r.merchant.trim(),
    type: r.type as TransactionType,
    action,
    frequency,
    customNote,
  };
}

function parseDelete(raw: unknown): OverrideDeleteBody | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.merchant !== "string" || r.merchant.trim() === "") return null;
  if (typeof r.type !== "string" || !VALID_TYPES.includes(r.type as TransactionType)) {
    return null;
  }
  return { merchant: r.merchant.trim(), type: r.type as TransactionType };
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw: unknown = await request.json().catch((err) => {
      console.error("POST /api/recurring/overrides JSON parse failed:", err);
      return null;
    });
    const body = parsePost(raw);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const exists = await merchantExistsForUser(session.userId, body.merchant, body.type);
    if (!exists) {
      return NextResponse.json(
        { error: "Merchant not found in your transactions" },
        { status: 404 },
      );
    }

    await upsertRecurringOverride({
      userId: session.userId,
      merchant: body.merchant,
      type: body.type,
      action: body.action,
      frequency: body.frequency,
      customNote: body.customNote,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/recurring/overrides failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw: unknown = await request.json().catch((err) => {
      console.error("DELETE /api/recurring/overrides JSON parse failed:", err);
      return null;
    });
    const body = parseDelete(raw);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const removed = await deleteRecurringOverride(session.userId, body.merchant, body.type);
    return NextResponse.json({ ok: removed });
  } catch (err) {
    console.error("DELETE /api/recurring/overrides failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
