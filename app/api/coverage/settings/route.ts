import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  deleteCardSettings,
  trackCard,
  upsertCardStartDate,
} from "@/lib/models/card-settings";
import { parseDateOnly } from "@/lib/range";
import { CARD_TYPES, type CardType } from "@/types";

export const runtime = "nodejs";

function isCardType(value: unknown): value is CardType {
  return typeof value === "string" && CARD_TYPES.includes(value as CardType);
}

function parseStartDate(value: unknown): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  return parseDateOnly(value) ?? null;
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch (err) {
      console.error("PATCH /api/coverage/settings JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { cardType, startDate: startDateRaw, track } = body as {
      cardType?: unknown;
      startDate?: unknown;
      track?: unknown;
    };

    if (!isCardType(cardType)) {
      return NextResponse.json({ error: "Invalid card type" }, { status: 400 });
    }

    if (track === true) {
      await trackCard({ userId: session.userId, cardType });
      if (typeof startDateRaw === "string" && startDateRaw) {
        const startDate = parseStartDate(startDateRaw);
        if (startDate) {
          await upsertCardStartDate({ userId: session.userId, cardType, startDate });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (startDateRaw === undefined) {
      return NextResponse.json({ error: "startDate or track is required" }, { status: 400 });
    }

    const startDate = parseStartDate(startDateRaw);
    if (startDateRaw !== null && startDateRaw !== "" && !startDate) {
      return NextResponse.json({ error: "Invalid start date" }, { status: 400 });
    }

    if (startDate) {
      await upsertCardStartDate({
        userId: session.userId,
        cardType,
        startDate,
      });
    } else {
      await deleteCardSettings(session.userId, cardType);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/coverage/settings failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
