import { NextResponse } from "next/server";
import { insertLoginFailureLog } from "@/lib/models/login-logs";
import type { LoginFailureStage } from "@/types";

export type LoginEnvChecks = {
  hasMongoUri: boolean;
  hasAuthSecret: boolean;
  nodeEnv: string;
};

export type LoginFailureDetail = {
  stage: LoginFailureStage;
  message: string;
  envChecks: LoginEnvChecks;
  host?: string;
  timestamp: string;
  extra?: string;
};

export function isConfigError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("AUTH_SECRET");
}

export function isDatabaseError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("mongodb_uri") ||
    msg.includes("mongo") ||
    msg.includes("econnrefused") ||
    msg.includes("server selection")
  );
}

export function isClientLoginFailureStage(stage: LoginFailureStage): boolean {
  return stage === "client_parse_error" || stage === "client_network_error";
}

export function getEnvChecks(): LoginEnvChecks {
  return {
    hasMongoUri: !!process.env.MONGODB_URI,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  };
}

export function extractRequestMeta(request: Request): { userAgent?: string; host?: string } {
  return {
    userAgent: request.headers.get("user-agent") ?? undefined,
    host: request.headers.get("host") ?? undefined,
  };
}

export function buildFailureDetail(
  stage: LoginFailureStage,
  message: string,
  request: Request,
  extra?: string,
): LoginFailureDetail {
  const { host } = extractRequestMeta(request);
  return {
    stage,
    message,
    envChecks: getEnvChecks(),
    host,
    timestamp: new Date().toISOString(),
    ...(extra ? { extra } : {}),
  };
}

export type RecordLoginFailureInput = {
  attemptedUsername: string;
  stage: LoginFailureStage;
  message: string;
  httpStatus: number;
  source: "server" | "client";
  request: Request;
  detail?: string;
};

export async function recordLoginFailure(input: RecordLoginFailureInput): Promise<string | null> {
  const { userAgent, host } = extractRequestMeta(input.request);
  try {
    return await insertLoginFailureLog({
      attemptedUsername: input.attemptedUsername,
      stage: input.stage,
      message: input.message,
      detail: input.detail,
      httpStatus: input.httpStatus,
      source: input.source,
      userAgent,
      host,
      envChecks: getEnvChecks(),
    });
  } catch (err) {
    console.error("recordLoginFailure: MongoDB insert failed:", err);
    return null;
  }
}

export type BuildLoginFailureResponseInput = {
  stage: LoginFailureStage;
  message: string;
  status: number;
  logId: string | null;
  detail: LoginFailureDetail;
};

export function buildLoginFailureResponse(input: BuildLoginFailureResponseInput): NextResponse {
  return NextResponse.json(
    {
      error: input.message,
      code: input.stage,
      ...(input.logId ? { logId: input.logId } : {}),
      detail: input.detail,
    },
    { status: input.status },
  );
}

export async function respondWithLoginFailure(
  input: Omit<RecordLoginFailureInput, "detail"> & { extra?: string },
): Promise<NextResponse> {
  const detail = buildFailureDetail(input.stage, input.message, input.request, input.extra);
  const logId = await recordLoginFailure({
    ...input,
    detail: input.extra ?? input.message,
  });
  return buildLoginFailureResponse({
    stage: input.stage,
    message: input.message,
    status: input.httpStatus,
    logId,
    detail,
  });
}
