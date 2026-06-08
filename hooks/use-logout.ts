"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

export function useLogout() {
  const router = useRouter();

  return useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Logout failed" }));
        toast.error(body.error ?? "Logout failed");
        return;
      }
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logout failed");
    }
  }, [router]);
}
