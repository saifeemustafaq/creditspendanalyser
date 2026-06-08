"use client";

import { CopyTextButton } from "@/components/copy-text-button";
import type { LoginFailureDetail } from "@/lib/services/login-diagnostics";
import type { LoginFailureStage } from "@/types";

export type LoginDiagnosticPayload = {
  error: string;
  code?: LoginFailureStage;
  logId?: string | null;
  detail?: LoginFailureDetail;
  httpStatus?: number;
  responseBodyPreview?: string;
};

type LoginErrorPanelProps = {
  payload: LoginDiagnosticPayload;
};

export function LoginErrorPanel({ payload }: LoginErrorPanelProps) {
  const formatted = JSON.stringify(payload, null, 2);

  return (
    <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-destructive">Login failed</p>
          <p className="text-xs text-muted-foreground">
            {payload.error}
            {payload.logId ? ` · Log ID: ${payload.logId}` : " · Log was not saved to MongoDB"}
          </p>
        </div>
        <CopyTextButton text={formatted} label="Login error" />
      </div>
      {!payload.logId && (
        <p className="mb-2 text-xs text-muted-foreground">
          Log was not saved to MongoDB — copy this text and share it for debugging.
        </p>
      )}
      <pre className="max-h-48 overflow-auto rounded bg-muted/60 p-2 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
        {formatted}
      </pre>
    </div>
  );
}
