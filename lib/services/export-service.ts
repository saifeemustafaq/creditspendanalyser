import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CARD_LABELS, type TransactionDoc } from "@/types";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildTransactionsCsv(rows: TransactionDoc[]): string {
  const header = ["Date", "Post Date", "Merchant", "Description", "Category", "Card", "Type", "Amount"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.transactionDate).toISOString().slice(0, 10),
        r.postDate ? new Date(r.postDate).toISOString().slice(0, 10) : "",
        r.merchant,
        r.rawDescription,
        r.category,
        CARD_LABELS[r.cardType],
        r.type,
        r.amount.toFixed(2),
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export interface PdfReportInput {
  rows: TransactionDoc[];
  startDate?: Date;
  endDate?: Date;
}

export function buildTransactionsPdf({ rows, startDate, endDate }: PdfReportInput): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setFontSize(16);
  doc.text("Credit Spend Analyser — Transaction Report", 40, 50);
  doc.setFontSize(10);
  const dateRange = startDate
    ? `${startDate.toLocaleDateString()} – ${(endDate ?? new Date()).toLocaleDateString()}`
    : "All time";
  doc.text(`Range: ${dateRange}`, 40, 68);
  const totalSpend = rows
    .filter((r) => r.type === "debit")
    .reduce((s, r) => s + r.amount, 0);
  doc.text(`${rows.length} transactions · $${totalSpend.toFixed(2)} total spend`, 40, 82);

  autoTable(doc, {
    startY: 100,
    head: [["Date", "Merchant", "Category", "Card", "Type", "Amount"]],
    body: rows.map((r) => [
      new Date(r.transactionDate).toLocaleDateString(),
      r.merchant,
      r.category,
      CARD_LABELS[r.cardType],
      r.type,
      `${r.type === "debit" ? "" : "-"}$${r.amount.toFixed(2)}`,
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 20, 20] },
  });

  return Buffer.from(doc.output("arraybuffer"));
}
