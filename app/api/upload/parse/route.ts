import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseAndPreview } from "@/lib/services/extraction-pipeline";
import { parseUploadRequest } from "./_helpers";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await parseUploadRequest(request, "POST /api/upload/parse");
    if (!parsed.ok) return parsed.response;
    const { file, override, buffer } = parsed.data;

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
