import type { MetadataRoute } from "next";
import {
  PWA_BACKGROUND_COLOR,
  PWA_THEME_COLOR,
} from "@/lib/pwa-icon-art";
import { PWA_MANIFEST_SHORTCUTS } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Credit Spend Analyser",
    short_name: "Spend Analyser",
    description: "Upload statements and analyze your credit card spending.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: PWA_THEME_COLOR,
    background_color: PWA_BACKGROUND_COLOR,
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: PWA_MANIFEST_SHORTCUTS,
  };
}
