import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCoverageForUser, getCoverageYearRange } from "@/lib/models/coverage";

export const runtime = "nodejs";

function toDateOnlyString(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [coverage, yearRange] = await Promise.all([
      getCoverageForUser(session.userId),
      getCoverageYearRange(session.userId),
    ]);

    return NextResponse.json({
      coverage: coverage.map((c) => ({
        cardType: c.cardType,
        coveredRanges: c.coveredRanges.map((r) => ({
          start: r.start.toISOString(),
          end: r.end.toISOString(),
        })),
        startDate: toDateOnlyString(c.startDate),
      })),
      minYear: yearRange.minYear,
      maxYear: yearRange.maxYear,
    });
  } catch (err) {
    console.error("GET /api/coverage failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
