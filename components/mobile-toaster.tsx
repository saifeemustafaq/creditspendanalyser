"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/sonner";

export function MobileToaster() {
  const isMobile = useIsMobile();

  return (
    <Toaster
      richColors
      position={isMobile ? "bottom-center" : "top-right"}
      offset={
        isMobile
          ? "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 1rem)"
          : undefined
      }
    />
  );
}
