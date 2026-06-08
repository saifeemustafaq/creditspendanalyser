"use client";

import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { PwaUpdateToast } from "@/components/pwa-update-toast";

type SerwistProviderWrapperProps = {
  children: ReactNode;
};

export function SerwistProviderWrapper({ children }: SerwistProviderWrapperProps) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
      <PwaUpdateToast />
      {children}
    </SerwistProvider>
  );
}
