"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaIosInstallSheet } from "@/components/pwa-ios-install-sheet";
import { usePwaInstallActions } from "@/components/pwa-install-banner";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLogout } from "@/hooks/use-logout";
import { getSecondaryNavItems, isNavActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

type MobileMoreSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
};

export function MobileMoreSheet({ open, onOpenChange, username }: MobileMoreSheetProps) {
  const pathname = usePathname();
  const logout = useLogout();
  const secondaryItems = getSecondaryNavItems();
  const { showInstallUi, iosSheetOpen, setIosSheetOpen, triggerInstall } = usePwaInstallActions();

  function close() {
    onOpenChange(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="pb-safe max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription>Additional pages and account actions</SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {showInstallUi ? (
              <button
                type="button"
                onClick={() => {
                  close();
                  void triggerInstall();
                }}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Smartphone className="size-5 shrink-0" />
                Install app
              </button>
            ) : null}
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Separator className="mx-4" />
          <div className="flex items-center justify-between gap-3 px-4 pb-2">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="truncate text-sm font-medium">{username}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="mr-2 size-4" />
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <PwaIosInstallSheet open={iosSheetOpen} onOpenChange={setIosSheetOpen} />
    </>
  );
}
