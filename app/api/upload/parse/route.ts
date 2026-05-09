import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { detectFormat } from "@/lib/parsers";
import { parseAndPreview } from "@/lib/services/extraction-pipeline";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { CARD_TYPES, type CardType } from "@/types";

const ALLOWED_CARD_TYPES = CARD_TYPES;

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error("POST /api/upload/parse formData parse failed:", err);
      return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 413 });
    }

    const format = detectFormat(file.name, file.type);
    if (!format) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, CSV, XLS/XLSX, or an image." },
        { status: 400 },
      );
    }

    const overrideRaw = formData.get("cardType");
    const override =
      typeof overrideRaw === "string" && ALLOWED_CARD_TYPES.includes(overrideRaw as CardType)
        ? (overrideRaw as CardType)
        : undefined;

    const buffer = Buffer.from(await file.arrayBuffer());

    const preview = await parseAndPreview({
      userId: session.userId,
      buffer,
      filename: file.name,
      mimeType: file.type,
      overrideCardType: override,
    });

    return NextResponse.json({
      ok: true,
      originalFilename: file.name,
      ...preview,
    });
  } catch (err) {
    console.error("POST /api/upload/parse failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to parse statement";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
