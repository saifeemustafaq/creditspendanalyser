import { NextResponse } from "next/server";
import { detectFormat } from "@/lib/parsers";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { CARD_TYPES, type CardType } from "@/types";

const ALLOWED_CARD_TYPES = CARD_TYPES;

export type ParsedUploadRequest = {
  file: File;
  format: string;
  override: CardType | undefined;
  buffer: Buffer;
};

export type UploadParseResult =
  | { ok: true; data: ParsedUploadRequest }
  | { ok: false; response: NextResponse };

/**
 * Shared formData parsing, file validation, format detection, cardType override
 * resolution, and buffer reading. Used by both upload/route.ts and upload/parse/route.ts.
 */
export async function parseUploadRequest(
  request: Request,
  errorPrefix: string,
): Promise<UploadParseResult> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    console.error(`${errorPrefix} formData parse failed:`, err);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 },
      ),
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Missing 'file' field" }, { status: 400 }),
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `File exceeds ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit` },
        { status: 413 },
      ),
    };
  }

  const format = detectFormat(file.name, file.type);
  if (!format) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unsupported file type. Use PDF, CSV, XLS/XLSX, or an image." },
        { status: 400 },
      ),
    };
  }

  const overrideRaw = formData.get("cardType");
  const override =
    typeof overrideRaw === "string" && ALLOWED_CARD_TYPES.includes(overrideRaw as CardType)
      ? (overrideRaw as CardType)
      : undefined;

  const buffer = Buffer.from(await file.arrayBuffer());

  return { ok: true, data: { file, format, override, buffer } };
}
