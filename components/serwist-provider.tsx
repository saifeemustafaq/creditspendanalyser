"use client";

import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";

type SerwistProviderWrapperProps = {
  children: ReactNode;
};

export function SerwistProviderWrapper({ children }: SerwistProviderWrapperProps) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
      {children}
    </SerwistProvider>
  );
}
