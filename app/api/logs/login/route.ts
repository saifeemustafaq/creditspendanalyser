import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listRecentLoginFailureLogs } from "@/lib/models/login-logs";
import type { LoginAttemptLogApiRow } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await listRecentLoginFailureLogs();
    const logs: LoginAttemptLogApiRow[] = rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
    return NextResponse.json({ logs });
  } catch (err) {
    console.error("GET /api/logs/login failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
