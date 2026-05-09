import * as XLSX from "xlsx";

export async function parseCsv(buffer: Buffer): Promise<string> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return "";
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_csv(sheet);
}
