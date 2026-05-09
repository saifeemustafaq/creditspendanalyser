export async function parseImage(buffer: Buffer, mimeType: string): Promise<string> {
  const mt = mimeType && mimeType.startsWith("image/") ? mimeType : "image/png";
  return `data:${mt};base64,${buffer.toString("base64")}`;
}
