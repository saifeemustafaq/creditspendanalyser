import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getEnvChecks } from "@/lib/services/login-diagnostics";

export const runtime = "nodejs";

export async function GET() {
  try {
    const envChecks = getEnvChecks();
    const dbName = process.env.MONGODB_DB ?? "credit-spend";

    let mongoOk = false;
    let mongoError: string | undefined;

    if (!envChecks.hasMongoUri) {
      mongoError = "MONGODB_URI is not set";
    } else {
      try {
        const db = await getDb();
        await db.command({ ping: 1 });
        mongoOk = true;
      } catch (err) {
        console.error("GET /api/auth/health MongoDB ping failed:", err);
        mongoError = err instanceof Error ? err.message : "MongoDB ping failed";
      }
    }

    return NextResponse.json({
      ok: mongoOk && envChecks.hasAuthSecret,
      envChecks,
      mongo: { ok: mongoOk, error: mongoError, dbName },
      hint: !mongoOk
        ? "Check MONGODB_URI in Netlify env vars and Atlas Network Access (allow 0.0.0.0/0)."
        : !envChecks.hasAuthSecret
          ? "Set AUTH_SECRET (32+ chars) in Netlify env vars."
          : undefined,
    });
  } catch (err) {
    console.error("GET /api/auth/health failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
