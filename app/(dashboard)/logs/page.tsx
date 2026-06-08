"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyTextButton } from "@/components/copy-text-button";
import { LoginLogsTable } from "@/components/login-logs-table";
import { parseLoginLogsListResponse } from "@/components/login-response-parser";
import { cn } from "@/lib/utils";
import type { LoginAttemptLogApiRow } from "@/types";

export default function LogsPage() {
  const [logs, setLogs] = useState<LoginAttemptLogApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/logs/login", { signal: ctrl.signal });
        const data = await res.json().catch((err) => {
          console.error("LogsPage: response JSON parse failed:", err);
          return { error: "Failed to parse logs response" };
        });
        if (!res.ok) {
          const msg = data.error ?? `Failed to load logs (${res.status})`;
          setFetchError(msg);
          setLogs([]);
          toast.error(msg);
          return;
        }
        setLogs(parseLoginLogsListResponse(data));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Failed to load logs";
        setFetchError(msg);
        setLogs([]);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [refreshTick]);

  const allFormatted = JSON.stringify(logs, null, 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Login failure logs</h1>
          <p className="text-sm text-muted-foreground">
            Recent failed sign-in attempts with diagnostic detail.
          </p>
        </div>
        <div className="flex gap-2">
          <CopyTextButton text={allFormatted} label="All logs" />
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={loading}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {fetchError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              Could not load logs — MongoDB may be unreachable
            </CardTitle>
            <CardDescription>Copy the error below when reporting issues.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <pre className="overflow-auto rounded bg-muted/60 p-2 text-xs whitespace-pre-wrap break-all">
              {fetchError}
            </pre>
            <CopyTextButton text={fetchError} label="Error" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : logs.length === 0 && !fetchError ? (
            <p className="p-6 text-sm text-muted-foreground">No failed login attempts recorded.</p>
          ) : (
            <LoginLogsTable logs={logs} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
