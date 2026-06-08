import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/~offline"];

const PWA_PUBLIC_PREFIXES = ["/serwist/", "/icons/", "/apple-startup/"];

function isPublicRequest(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (PWA_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return true;
  }
  if (pathname === "/manifest.webmanifest") {
    return true;
  }
  if (pathname.startsWith("/api/auth")) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRequest(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets, PWA assets, and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|serwist|icons|apple-startup|manifest.webmanifest|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)",
  ],
};
