"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLogout } from "@/hooks/use-logout";
import { getPageTitle } from "@/lib/nav";

type MobilePageHeaderProps = {
  username: string;
};

export function MobilePageHeader({ username }: MobilePageHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const logout = useLogout();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 pt-safe">
      <SidebarTrigger className="hidden md:inline-flex" />
      <Separator orientation="vertical" className="mx-2 hidden h-5 md:block" />
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold md:hidden">{title}</h1>
      <h1 className="hidden flex-1 text-sm font-medium text-muted-foreground md:block">
        Credit Spend Analyser
      </h1>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 md:hidden"
        onClick={() => void logout()}
        aria-label={`Sign out (${username})`}
      >
        <LogOut className="size-5" />
      </Button>
    </header>
  );
}
