import type { ExtractedTransaction } from "@/types";
import type { StructuredRow } from "@/lib/parsers";

// null means "skip this row" — used e.g. to drop Pending transactions
export type RowAdapter = (row: StructuredRow) => ExtractedTransaction | null;
