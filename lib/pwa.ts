import type { MetadataRoute } from "next";

export const PWA_INSTALL_DISMISS_KEY = "pwa-install-dismissed-at";
export const PWA_INSTALL_DISMISS_EVENT = "pwa-install-dismissed";
export const PWA_INSTALL_DISMISS_LEGACY_KEY = "pwa-install-dismissed";
export const PWA_INSTALL_DISMISS_TTL_MS = 21 * 24 * 60 * 60 * 1000;

const PWA_SHORTCUT_ICON: MetadataRoute.Manifest["icons"] = [
  {
    src: "/icons/icon-192",
    sizes: "192x192",
    type: "image/png",
  },
];

export const PWA_MANIFEST_SHORTCUTS: NonNullable<MetadataRoute.Manifest["shortcuts"]> = [
  {
    name: "Dashboard",
    short_name: "Dashboard",
    url: "/",
    icons: PWA_SHORTCUT_ICON,
  },
  {
    name: "Upload",
    short_name: "Upload",
    url: "/upload",
    icons: PWA_SHORTCUT_ICON,
  },
  {
    name: "Transactions",
    short_name: "Transactions",
    url: "/transactions",
    icons: PWA_SHORTCUT_ICON,
  },
];

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function readDismissedAt(): string | null {
  const dismissedAt = localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
  if (dismissedAt) return dismissedAt;

  if (localStorage.getItem(PWA_INSTALL_DISMISS_LEGACY_KEY) === "1") {
    const now = new Date().toISOString();
    localStorage.setItem(PWA_INSTALL_DISMISS_KEY, now);
    localStorage.removeItem(PWA_INSTALL_DISMISS_LEGACY_KEY);
    return now;
  }

  return null;
}

export function isPwaInstallDismissed(): boolean {
  const dismissedAt = readDismissedAt();
  if (!dismissedAt) return false;

  const timestamp = Date.parse(dismissedAt);
  if (Number.isNaN(timestamp)) return false;

  return Date.now() - timestamp < PWA_INSTALL_DISMISS_TTL_MS;
}

export function markPwaInstallDismissed(): void {
  localStorage.setItem(PWA_INSTALL_DISMISS_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(PWA_INSTALL_DISMISS_EVENT));
}
