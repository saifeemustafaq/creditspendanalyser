import { NextResponse } from "next/server";
import {
  buildFailureDetail,
  isClientLoginFailureStage,
  recordLoginFailure,
} from "@/lib/services/login-diagnostics";
import type { LoginFailureStage } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    let body: {
      attemptedUsername?: string;
      stage?: LoginFailureStage;
      message?: string;
      detail?: string;
      httpStatus?: number;
    };
    try {
      body = await request.json();
    } catch (err) {
      console.error("POST /api/auth/log JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { attemptedUsername, stage, message, detail, httpStatus } = body;

    if (!stage || !message || !isClientLoginFailureStage(stage)) {
      return NextResponse.json({ error: "Invalid log payload" }, { status: 400 });
    }

    const username = attemptedUsername?.trim() ?? "";
    const status = httpStatus ?? 0;
    const failureDetail = buildFailureDetail(stage, message, request, detail);

    const logId = await recordLoginFailure({
      attemptedUsername: username,
      stage,
      message,
      httpStatus: status,
      source: "client",
      request,
      detail: detail ?? message,
    });

    return NextResponse.json({
      logId,
      code: stage,
      message,
      detail: failureDetail,
    });
  } catch (err) {
    console.error("POST /api/auth/log failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
