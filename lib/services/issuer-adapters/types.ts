import type { ExtractedTransaction } from "@/types";
import type { StructuredRow } from "@/lib/parsers";

export type RowAdapter = (row: StructuredRow) => ExtractedTransaction;
