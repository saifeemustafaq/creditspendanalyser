"use client";

import { Share } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PwaIosInstallSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PwaIosInstallSheet({ open, onOpenChange }: PwaIosInstallSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe max-h-[85dvh] md:hidden">
        <SheetHeader>
          <SheetTitle>Install on iPhone</SheetTitle>
          <SheetDescription>Add Credit Spend Analyser to your home screen for quick access.</SheetDescription>
        </SheetHeader>
        <ol className="flex flex-col gap-4 px-4 pb-4 text-sm">
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              1
            </span>
            <span className="pt-0.5">
              Tap the <Share className="mx-0.5 inline size-4 align-text-bottom" aria-hidden /> Share
              button in Safari&apos;s toolbar.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              2
            </span>
            <span className="pt-0.5">
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              3
            </span>
            <span className="pt-0.5">
              Confirm the name, then tap <strong>Add</strong> to install.
            </span>
          </li>
        </ol>
      </SheetContent>
    </Sheet>
  );
}
