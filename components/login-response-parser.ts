import type { LoginDiagnosticPayload } from "@/components/login-error-panel";
import type { LoginFailureDetail } from "@/lib/services/login-diagnostics";
import type { LoginAttemptLogApiRow, LoginFailureStage } from "@/types";

export type AuthErrorResponse = {
  error?: string;
  code?: LoginFailureStage;
  logId?: string;
  detail?: LoginFailureDetail;
  username?: string;
};

function isLoginFailureStage(v: unknown): v is LoginFailureStage {
  return (
    v === "invalid_json" ||
    v === "missing_credentials" ||
    v === "user_not_found" ||
    v === "invalid_password" ||
    v === "session_error" ||
    v === "database_error" ||
    v === "config_error" ||
    v === "client_parse_error" ||
    v === "client_network_error" ||
    v === "unexpected"
  );
}

function isLoginFailureDetail(v: unknown): v is LoginFailureDetail {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  if (!isLoginFailureStage(d.stage)) return false;
  if (typeof d.message !== "string") return false;
  if (typeof d.timestamp !== "string") return false;
  if (!d.envChecks || typeof d.envChecks !== "object") return false;
  const env = d.envChecks as Record<string, unknown>;
  if (typeof env.hasMongoUri !== "boolean") return false;
  if (typeof env.hasAuthSecret !== "boolean") return false;
  if (typeof env.nodeEnv !== "string") return false;
  if (d.host !== undefined && typeof d.host !== "string") return false;
  if (d.extra !== undefined && typeof d.extra !== "string") return false;
  return true;
}

export function parseAuthErrorResponse(raw: unknown): AuthErrorResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.error !== undefined && typeof r.error !== "string") return null;
  if (r.code !== undefined && !isLoginFailureStage(r.code)) return null;
  if (r.logId !== undefined && typeof r.logId !== "string") return null;
  if (r.username !== undefined && typeof r.username !== "string") return null;
  if (r.detail !== undefined && !isLoginFailureDetail(r.detail)) return null;
  return {
    error: typeof r.error === "string" ? r.error : undefined,
    code: isLoginFailureStage(r.code) ? r.code : undefined,
    logId: typeof r.logId === "string" ? r.logId : undefined,
    username: typeof r.username === "string" ? r.username : undefined,
    detail: isLoginFailureDetail(r.detail) ? r.detail : undefined,
  };
}

type ClientLogResponse = {
  logId?: string | null;
  code?: LoginFailureStage;
  message?: string;
  detail?: LoginFailureDetail;
};

function parseClientLogResponse(raw: unknown): ClientLogResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.error !== undefined && typeof r.error !== "string") return null;
  if (r.logId !== undefined && r.logId !== null && typeof r.logId !== "string") return null;
  if (r.code !== undefined && !isLoginFailureStage(r.code)) return null;
  if (r.message !== undefined && typeof r.message !== "string") return null;
  if (r.detail !== undefined && !isLoginFailureDetail(r.detail)) return null;
  return {
    logId: r.logId === null || typeof r.logId === "string" ? r.logId : undefined,
    code: isLoginFailureStage(r.code) ? r.code : undefined,
    message: typeof r.message === "string" ? r.message : undefined,
    detail: isLoginFailureDetail(r.detail) ? r.detail : undefined,
  };
}

function buildClientFallback(
  input: {
    attemptedUsername: string;
    stage: "client_parse_error" | "client_network_error";
    message: string;
    detail?: string;
    httpStatus?: number;
  },
): LoginDiagnosticPayload {
  return {
    error: input.message,
    code: input.stage,
    logId: null,
    httpStatus: input.httpStatus,
    detail: {
      stage: input.stage,
      message: input.message,
      envChecks: { hasMongoUri: false, hasAuthSecret: false, nodeEnv: "unknown" },
      timestamp: new Date().toISOString(),
      ...(input.detail ? { extra: input.detail } : {}),
    },
  };
}

function isLoginAttemptLogApiRow(v: unknown): v is LoginAttemptLogApiRow {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  if (typeof r._id !== "string") return false;
  if (typeof r.logId !== "string") return false;
  if (typeof r.attemptedUsername !== "string") return false;
  if (!isLoginFailureStage(r.stage)) return false;
  if (typeof r.message !== "string") return false;
  if (typeof r.httpStatus !== "number") return false;
  if (r.source !== "server" && r.source !== "client") return false;
  if (typeof r.createdAt !== "string") return false;
  return true;
}

export function parseLoginLogsListResponse(raw: unknown): LoginAttemptLogApiRow[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.logs)) return [];
  return r.logs.filter(isLoginAttemptLogApiRow);
}

export async function reportClientLoginFailure(input: {
  attemptedUsername: string;
  stage: "client_parse_error" | "client_network_error";
  message: string;
  detail?: string;
  httpStatus?: number;
}): Promise<LoginDiagnosticPayload> {
  const fallback = buildClientFallback(input);

  try {
    const res = await fetch("/api/auth/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const raw: unknown = await res.json().catch((err) => {
      console.error("reportClientLoginFailure: response JSON parse failed:", err);
      return null;
    });
    if (!raw || typeof raw !== "object") {
      return fallback;
    }
    const body = raw as Record<string, unknown>;
    if (!res.ok) {
      return {
        ...fallback,
        error: typeof body.error === "string" ? body.error : input.message,
      };
    }
    const parsed = parseClientLogResponse(raw);
    if (!parsed) return fallback;
    return {
      error: parsed.message ?? input.message,
      code: parsed.code,
      logId: parsed.logId ?? null,
      detail: parsed.detail,
      httpStatus: input.httpStatus,
    };
  } catch (err) {
    console.error("reportClientLoginFailure: fetch failed:", err);
    return fallback;
  }
}
