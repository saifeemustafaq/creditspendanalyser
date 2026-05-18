import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { detectRecurringTransactions } from "@/lib/models/recurring";
import type { RecurringStatus, TransactionType } from "@/types";

export const runtime = "nodejs";

const VALID_TYPES: ReadonlyArray<TransactionType | "all"> = [
  "debit",
  "credit",
  "payment",
  "all",
];
const VALID_STATUSES: ReadonlyArray<RecurringStatus | "all"> = [
  "active",
  "possibly_cancelled",
  "new",
  "all",
];

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const rawType = url.searchParams.get("type") ?? "all";
    const rawStatus = url.searchParams.get("status") ?? "all";

    const typeFilter = (VALID_TYPES as readonly string[]).includes(rawType)
      ? (rawType as TransactionType | "all")
      : "all";
    const statusFilter = (VALID_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as RecurringStatus | "all")
      : "all";

    const summary = await detectRecurringTransactions(session.userId);

    const filteredItems = summary.items.filter((i) => {
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    });

    return NextResponse.json({ ...summary, items: filteredItems });
  } catch (err) {
    console.error("GET /api/recurring failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
