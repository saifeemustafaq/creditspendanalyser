"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type MobileFilterBarProps = {
  activeCount?: number;
  quickChips?: React.ReactNode;
  footer?: React.ReactNode;
  desktopClassName?: string;
  renderFilters: () => React.ReactNode;
};

export function MobileFilterBar({
  activeCount = 0,
  quickChips,
  footer,
  desktopClassName,
  renderFilters,
}: MobileFilterBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("hidden md:flex", desktopClassName ?? "flex-wrap items-center gap-2")}>
        {renderFilters()}
      </div>

      <div className="flex w-full items-center gap-2 md:hidden">
        {quickChips}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto min-h-11 shrink-0"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 ? (
            <Badge variant="secondary" className="ml-1.5 min-w-5 justify-center px-1.5">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="pb-safe max-h-[85dvh] md:hidden">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Adjust what data is shown</SheetDescription>
          </SheetHeader>
          {open ? (
            <>
              <div className="flex flex-col gap-3 px-4">{renderFilters()}</div>
              {footer ? <div className="flex flex-col gap-2 px-4 pb-2">{footer}</div> : null}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
