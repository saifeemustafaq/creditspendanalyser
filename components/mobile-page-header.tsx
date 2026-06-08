"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getPageTitle } from "@/lib/nav";

export function MobilePageHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 pt-safe">
      <SidebarTrigger className="hidden md:inline-flex" />
      <Separator orientation="vertical" className="mx-2 hidden h-5 md:block" />
      <h1 className="truncate text-sm font-semibold md:hidden">{title}</h1>
      <h1 className="hidden text-sm font-medium text-muted-foreground md:block">
        Credit Spend Analyser
      </h1>
    </header>
  );
}
