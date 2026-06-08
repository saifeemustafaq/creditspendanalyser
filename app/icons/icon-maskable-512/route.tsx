import { ImageResponse } from "next/og";
import { PwaIconArt } from "@/lib/pwa-icon-art";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(<PwaIconArt size={512} maskable />, {
    width: 512,
    height: 512,
  });
}
