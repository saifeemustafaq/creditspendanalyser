import { ImageResponse } from "next/og";
import { PwaIconArt } from "@/lib/pwa-icon-art";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(<PwaIconArt size={192} />, {
    width: 192,
    height: 192,
  });
}
