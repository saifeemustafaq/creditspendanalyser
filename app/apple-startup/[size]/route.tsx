import { ImageResponse } from "next/og";
import { parseStartupSizeParam } from "@/lib/pwa-startup-images";
import { PwaSplashArt } from "@/lib/pwa-splash-art";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const dimensions = parseStartupSizeParam(size);
  if (!dimensions) {
    return new Response("Invalid size", { status: 400 });
  }

  const { width, height } = dimensions;

  return new ImageResponse(<PwaSplashArt width={width} height={height} />, {
    width,
    height,
  });
}
