"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PwaIosInstallSheet } from "@/components/pwa-ios-install-sheet";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function LoginPwaInstallHint() {
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const { showInstallUi, canPromptInstall, showIosGuide, promptInstall } = usePwaInstall();

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
      <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/40 p-3 md:hidden">
        <Smartphone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          Install for quick access from your home screen.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9 shrink-0"
          onClick={() => void handleInstall()}
        >
          Install
        </Button>
      </div>
      <PwaIosInstallSheet open={iosSheetOpen} onOpenChange={setIosSheetOpen} />
    </>
  );
}
