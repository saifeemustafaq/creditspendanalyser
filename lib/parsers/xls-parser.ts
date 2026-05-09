import * as XLSX from "xlsx";

export async function parseXls(buffer: Buffer): Promise<string> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const name of wb.SheetNames) {
    parts.push(`# Sheet: ${name}`);
    parts.push(XLSX.utils.sheet_to_csv(wb.Sheets[name]));
  }
  return parts.join("\n\n");
}
