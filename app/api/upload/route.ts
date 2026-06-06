import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runExtractionPipeline } from "@/lib/services/extraction-pipeline";
import { parseUploadRequest } from "./_helpers";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await parseUploadRequest(request, "POST /api/upload");
    if (!parsed.ok) return parsed.response;
    const { file, override, buffer } = parsed.data;

    const result = await runExtractionPipeline({
      userId: session.userId,
      buffer,
      filename: file.name,
      mimeType: file.type,
      overrideCardType: override,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("POST /api/upload failed:", err);
    const msg = err instanceof Error ? err.message : "Failed to process statement";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
