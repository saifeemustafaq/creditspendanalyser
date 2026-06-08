import type { ReactNode } from "react";
import { PWA_ICON_BG, PwaIconArt } from "@/lib/pwa-icon-art";

type PwaSplashArtProps = {
  width: number;
  height: number;
};

export function PwaSplashArt({ width, height }: PwaSplashArtProps): ReactNode {
  const iconSize = Math.round(Math.min(width, height) * 0.22);

  return (
    <div
      style={{
        width,
        height,
        background: PWA_ICON_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PwaIconArt size={iconSize} />
    </div>
  );
}
