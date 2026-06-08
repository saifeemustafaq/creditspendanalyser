"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { MobileMoreSheet } from "@/components/mobile-more-sheet";
import { getPrimaryNavItems, isNavActive, isSecondaryNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

type MobileBottomNavProps = {
  username: string;
};

export function MobileBottomNav({ username }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryItems = getPrimaryNavItems();
  const moreActive = isSecondaryNavActive(pathname);

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-safe backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
      >
        <div className="mx-auto flex h-[var(--bottom-nav-height)] max-w-lg items-stretch">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] leading-none transition-colors",
                  active ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] leading-none transition-colors",
              moreActive || moreOpen ? "font-medium text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className="size-5 shrink-0" aria-hidden />
            <span>More</span>
          </button>
        </div>
      </nav>
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} username={username} />
    </>
  );
}
