import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  FileText,
  History,
  LayoutDashboard,
  ListOrdered,
  Repeat,
  Upload,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const PRIMARY_NAV_HREFS = ["/", "/upload", "/transactions"] as const;

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/uploads", label: "Uploads", icon: History },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/coverage", label: "Coverage", icon: CalendarRange },
];

const primaryHrefSet = new Set<string>(PRIMARY_NAV_HREFS);

export function getPrimaryNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => primaryHrefSet.has(item.href));
}

export function getSecondaryNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => !primaryHrefSet.has(item.href));
}

export function getPageTitle(pathname: string): string {
  const item = NAV_ITEMS.find((entry) => entry.href === pathname);
  return item?.label ?? "Credit Spend Analyser";
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isSecondaryNavActive(pathname: string): boolean {
  return getSecondaryNavItems().some((item) => isNavActive(pathname, item.href));
}
