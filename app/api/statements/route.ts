import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStatementsForUser } from "@/lib/models/statements";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await getStatementsForUser(session.userId);
    return NextResponse.json({ rows });
  } catch (err) {
    console.error("GET /api/statements failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
