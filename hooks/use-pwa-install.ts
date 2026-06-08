"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useStandalone } from "@/hooks/use-standalone";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_EVENT = "pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribeDismissed(onStoreChange: () => void) {
  window.addEventListener(DISMISS_EVENT, onStoreChange);
  return () => window.removeEventListener(DISMISS_EVENT, onStoreChange);
}

function getDismissedSnapshot() {
  return localStorage.getItem(DISMISS_KEY) === "1";
}

function getDismissedServerSnapshot() {
  return false;
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
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
    localStorage.setItem(DISMISS_KEY, "1");
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      localStorage.setItem(DISMISS_KEY, "1");
      window.dispatchEvent(new Event(DISMISS_EVENT));
    }
    return outcome === "accepted";
  }, [deferredPrompt]);

  const canPromptInstall = deferredPrompt !== null;
  const showIosGuide = isIosSafari() && !isStandalone && !dismissed;
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
