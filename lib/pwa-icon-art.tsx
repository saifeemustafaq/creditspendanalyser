import type { CSSProperties, ReactNode } from "react";

export const PWA_ICON_BG = "#171717";
export const PWA_THEME_COLOR = "#171717";
export const PWA_THEME_COLOR_DARK = "#252525";
export const PWA_BACKGROUND_COLOR = "#ffffff";

type PwaIconArtProps = {
  size: number;
  maskable?: boolean;
};

function bar(height: number, style?: CSSProperties) {
  return (
    <div
      style={{
        width: "14%",
        height: `${height}%`,
        backgroundColor: "#ffffff",
        borderRadius: 2,
        ...style,
      }}
    />
  );
}

export function PwaIconArt({ size, maskable = false }: PwaIconArtProps): ReactNode {
  const inset = maskable ? size * 0.18 : size * 0.2;
  const inner = size - inset * 2;

  return (
    <div
      style={{
        width: size,
        height: size,
        background: PWA_ICON_BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: inner * 0.12,
          background: "rgba(255,255,255,0.12)",
          border: `${Math.max(1, size * 0.015)}px solid rgba(255,255,255,0.25)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: inner * 0.12,
        }}
      >
        <div
          style={{
            width: "42%",
            height: "14%",
            borderRadius: 3,
            background: "rgba(255,255,255,0.85)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flex: 1,
            gap: inner * 0.06,
            paddingTop: inner * 0.08,
          }}
        >
          {bar(45)}
          {bar(70)}
          {bar(55)}
          {bar(85)}
        </div>
      </div>
    </div>
  );
}
