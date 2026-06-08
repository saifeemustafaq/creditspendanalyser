"use client";

import { useSerwist } from "@serwist/turbopack/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function PwaUpdateToast() {
  const { serwist } = useSerwist();
  const toastShown = useRef(false);

  useEffect(() => {
    if (!serwist) return;

    const sw = serwist;

    function onWaiting(event: { wasWaitingBeforeRegister?: boolean }) {
      if (event.wasWaitingBeforeRegister) return;
      if (toastShown.current) return;
      toastShown.current = true;

      toast("New version available", {
        description: "Refresh to get the latest version.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => {
            sw.messageSkipWaiting();
            window.location.reload();
          },
        },
      });
    }

    sw.addEventListener("waiting", onWaiting);
    return () => sw.removeEventListener("waiting", onWaiting);
  }, [serwist]);

  return null;
}
