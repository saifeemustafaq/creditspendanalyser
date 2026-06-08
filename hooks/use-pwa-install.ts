"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useStandalone } from "@/hooks/use-standalone";
import {
  isIosDevice,
  isPwaInstallDismissed,
  markPwaInstallDismissed,
  PWA_INSTALL_DISMISS_EVENT,
} from "@/lib/pwa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribeDismissed(onStoreChange: () => void) {
  window.addEventListener(PWA_INSTALL_DISMISS_EVENT, onStoreChange);
  return () => window.removeEventListener(PWA_INSTALL_DISMISS_EVENT, onStoreChange);
}

function getDismissedSnapshot() {
  return isPwaInstallDismissed();
}

function getDismissedServerSnapshot() {
  return false;
}

export function usePwaInstall() {
  const isStandalone = useStandalone();
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot,
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const dismiss = useCallback(() => {
    markPwaInstallDismissed();
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      markPwaInstallDismissed();
    }
    return outcome === "accepted";
  }, [deferredPrompt]);

  const canPromptInstall = deferredPrompt !== null;
  const showIosGuide = isIosDevice() && !isStandalone && !dismissed;
  const showInstallUi = !isStandalone && !dismissed && (canPromptInstall || showIosGuide);

  return {
    isStandalone,
    dismissed,
    canPromptInstall,
    showIosGuide,
    showInstallUi,
    dismiss,
    promptInstall,
  };
}
