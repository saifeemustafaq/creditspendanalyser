"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  mobileFilterSheetBodyClass,
  mobileFilterSheetContentClass,
  mobileFilterSheetFooterClass,
  mobileFilterSheetOverlayClass,
  mobileFilterTriggerClass,
} from "@/lib/mobile-filter-sheet";
import { cn } from "@/lib/utils";

type MobileFilterBarProps = {
  activeCount?: number;
  quickChips?: React.ReactNode;
  footer?: React.ReactNode;
  desktopClassName?: string;
  renderFilters: () => React.ReactNode;
  renderMobileFilters?: () => React.ReactNode;
};

export function MobileFilterBar({
  activeCount = 0,
  quickChips,
  footer,
  desktopClassName,
  renderFilters,
  renderMobileFilters,
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
        <SheetContent
          side="bottom"
          overlayClassName={mobileFilterSheetOverlayClass}
          className={cn(mobileFilterSheetContentClass, "max-h-[85dvh]")}
        >
          <div className="flex justify-center pt-3 pb-1" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <SheetHeader className="space-y-1 border-b px-4 pb-4 pt-0 text-left">
            <SheetTitle className="text-lg">Filters</SheetTitle>
            <SheetDescription>Adjust what data is shown</SheetDescription>
          </SheetHeader>
          {open ? (
            <>
              <div className={mobileFilterSheetBodyClass}>
                {renderMobileFilters ? renderMobileFilters() : renderFilters()}
              </div>
              <SheetFooter className={cn(mobileFilterSheetFooterClass, "gap-3")}>
                {footer}
                <Button
                  type="button"
                  className={mobileFilterTriggerClass}
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
