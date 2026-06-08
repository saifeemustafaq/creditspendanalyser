"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/use-online";
import { cn } from "@/lib/utils";

type OfflineBannerProps = {
  className?: string;
};

export function OfflineBanner({ className }: OfflineBannerProps) {
  const online = useOnline();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-sm text-amber-950 dark:text-amber-100",
        className,
      )}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <WifiOff className="size-4 shrink-0" aria-hidden />
        You&apos;re offline — data may be stale
      </span>
    </div>
  );
}
