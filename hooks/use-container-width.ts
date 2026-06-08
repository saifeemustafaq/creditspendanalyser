"use client";

import { useEffect, useRef, useState } from "react";
import { MOBILE_BREAKPOINT } from "@/lib/constants";

type ContainerWidth = {
  ref: React.RefObject<HTMLDivElement | null>;
  width: number;
  /** Container width below the app mobile breakpoint. */
  isCompact: boolean;
  /** Tight axis label rotation threshold (container under 400px). */
  isNarrow: boolean;
};

export function useContainerWidth(): ContainerWidth {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    width,
    isCompact: width > 0 && width < MOBILE_BREAKPOINT,
    isNarrow: width > 0 && width < 400,
  };
}
