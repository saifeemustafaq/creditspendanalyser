import type { FileFormat } from "@/types";
import { parsePdf } from "./pdf-parser";
import { parseCsv } from "./csv-parser";
import { parseXls } from "./xls-parser";
import { parseImage } from "./image-parser";
import { parseCsvStructured, type StructuredRow } from "./csv-row-parser";

export interface ParsedFile {
  format: FileFormat;
  /** Unified plain text rendering of the file (rows joined for tabular formats). */
  text: string;
  /** For images, the base64 data URL; null otherwise. */
  imageDataUrl: string | null;
  /** For CSV/XLS files, structured rows extracted directly without AI; null otherwise. */
  structuredRows: StructuredRow[] | null;
}

export function detectFormat(filename: string, mimeType: string): FileFormat | null {
  const lower = filename.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mimeType === "text/csv" || lower.endsWith(".csv")) return "csv";
  if (
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return "xls";
  if (mimeType.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(lower)) return "image";
  return null;
}

export async function parseFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ParsedFile> {
  const format = detectFormat(filename, mimeType);
  if (!format) {
    throw new Error(`Unsupported file type: ${mimeType || filename}`);
  }
  switch (format) {
    case "pdf":
      return {
        format,
        text: await parsePdf(buffer),
        imageDataUrl: null,
        structuredRows: null,
      };
    case "csv": {
      const [text, structuredRows] = await Promise.all([
        parseCsv(buffer),
        parseCsvStructured(buffer),
      ]);
      return {
        format,
        text,
        imageDataUrl: null,
        structuredRows: structuredRows.length > 0 ? structuredRows : null,
      };
    }
    case "xls": {
      const [text, structuredRows] = await Promise.all([
        parseXls(buffer),
        parseCsvStructured(buffer),
      ]);
      return {
        format,
        text,
        imageDataUrl: null,
        structuredRows: structuredRows.length > 0 ? structuredRows : null,
      };
    }
    case "image":
      return {
        format,
        text: "",
        imageDataUrl: await parseImage(buffer, mimeType),
        structuredRows: null,
      };
  }
}

export type { StructuredRow };
