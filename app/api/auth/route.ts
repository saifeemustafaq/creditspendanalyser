import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, setSessionCookie } from "@/lib/auth";
import { findUserByUsername, validatePassword } from "@/lib/models/users";
import {
  isConfigError,
  isDatabaseError,
  respondWithLoginFailure,
} from "@/lib/services/login-diagnostics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let attemptedUsername = "";
  try {
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch (err) {
      console.error("POST /api/auth JSON parse failed:", err);
      return respondWithLoginFailure({
        attemptedUsername: "",
        stage: "invalid_json",
        message: "Invalid JSON",
        httpStatus: 400,
        source: "server",
        request,
        extra: err instanceof Error ? err.message : "Request body is not valid JSON",
      });
    }

    const { username, password } = body;
    attemptedUsername = username?.trim() ?? "";

    if (!username || !password) {
      return respondWithLoginFailure({
        attemptedUsername,
        stage: "missing_credentials",
        message: "Username and password required",
        httpStatus: 400,
        source: "server",
        request,
      });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return respondWithLoginFailure({
        attemptedUsername,
        stage: "user_not_found",
        message: "Invalid credentials",
        httpStatus: 401,
        source: "server",
        request,
        extra: `No user found for username "${username}"`,
      });
    }

    const ok = await validatePassword(user, password);
    if (!ok) {
      return respondWithLoginFailure({
        attemptedUsername,
        stage: "invalid_password",
        message: "Invalid credentials",
        httpStatus: 401,
        source: "server",
        request,
        extra: "Password comparison returned false",
      });
    }

    try {
      await setSessionCookie({ userId: user._id.toString(), username: user.username });
    } catch (err) {
      console.error("POST /api/auth setSessionCookie failed:", err);
      return respondWithLoginFailure({
        attemptedUsername,
        stage: "session_error",
        message: "Session could not be created",
        httpStatus: 500,
        source: "server",
        request,
        extra: err instanceof Error ? err.message : "setSessionCookie failed",
      });
    }

    return NextResponse.json({ ok: true, username: user.username });
  } catch (err) {
    console.error("POST /api/auth failed:", err);

    if (isConfigError(err)) {
      return respondWithLoginFailure({
        attemptedUsername,
        stage: "config_error",
        message: "AUTH_SECRET is not set",
        httpStatus: 500,
        source: "server",
        request,
        extra: err instanceof Error ? err.message : "AUTH_SECRET missing",
      });
    }

    if (isDatabaseError(err)) {
      return respondWithLoginFailure({
        attemptedUsername,
        stage: "database_error",
        message: "Database error",
        httpStatus: 500,
        source: "server",
        request,
        extra: err instanceof Error ? err.message : "MONGODB_URI missing",
      });
    }

    return respondWithLoginFailure({
      attemptedUsername,
      stage: "unexpected",
      message: "Internal server error",
      httpStatus: 500,
      source: "server",
      request,
      extra: err instanceof Error ? err.stack ?? err.message : "Unknown error",
    });
  }
}

export async function DELETE() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/auth failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    return NextResponse.json({ username: session.username });
  } catch (err) {
    console.error("GET /api/auth failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
