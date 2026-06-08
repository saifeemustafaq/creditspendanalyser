import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia("(display-mode: standalone)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone;
}

function getServerSnapshot() {
  return false;
}

export function useStandalone() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
