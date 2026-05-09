import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, setSessionCookie } from "@/lib/auth";
import { findUserByUsername, validatePassword } from "@/lib/models/users";

export async function POST(request: Request) {
  try {
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch (err) {
      console.error("POST /api/auth JSON parse failed:", err);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const ok = await validatePassword(user, password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setSessionCookie({ userId: user._id.toString(), username: user.username });
    return NextResponse.json({ ok: true, username: user.username });
  } catch (err) {
    console.error("POST /api/auth failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
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
