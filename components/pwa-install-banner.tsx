"use client";

import { useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaIosInstallSheet } from "@/components/pwa-ios-install-sheet";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

type PwaInstallBannerProps = {
  className?: string;
};

export function PwaInstallBanner({ className }: PwaInstallBannerProps) {
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const { showInstallUi, canPromptInstall, showIosGuide, dismiss, promptInstall } = usePwaInstall();

  if (!showInstallUi) return null;

  async function handleInstall() {
    if (canPromptInstall) {
      await promptInstall();
      return;
    }
    if (showIosGuide) {
      setIosSheetOpen(true);
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm",
          className,
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Download className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium">Install this app</p>
            <p className="text-xs text-muted-foreground">
              Add to your home screen for faster access and a full-screen experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="min-h-11" onClick={() => void handleInstall()}>
              Install
            </Button>
            <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss install banner"
        >
          <X className="size-4" />
        </Button>
      </div>
      <PwaIosInstallSheet open={iosSheetOpen} onOpenChange={setIosSheetOpen} />
    </>
  );
}

export function usePwaInstallActions() {
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const { showInstallUi, canPromptInstall, showIosGuide, promptInstall } = usePwaInstall();

  async function triggerInstall() {
    if (canPromptInstall) {
      await promptInstall();
      return;
    }
    if (showIosGuide) {
      setIosSheetOpen(true);
    }
  }

  return {
    showInstallUi,
    iosSheetOpen,
    setIosSheetOpen,
    triggerInstall,
  };
}
