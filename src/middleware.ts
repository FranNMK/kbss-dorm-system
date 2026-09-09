import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/session";

/**
 * Route protection middleware — no Auth0.
 *
 * Protected paths: /dashboard/*, /api/* (except /api/auth/*)
 * Public paths: /, /about, /contact, /login, /api/auth/*
 *
 * Unauthenticated requests to protected paths → redirect to /login (HTML)
 *   or return 401 JSON (API routes).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isAuthApiRoute = pathname.startsWith("/api/auth/");
  const isDashboard = pathname.startsWith("/dashboard");

  // Let public API auth routes (login, logout, reset) pass through
  if (isAuthApiRoute) return NextResponse.next();

  // Protected: dashboard pages and all other API routes
  if (isDashboard || (isApiRoute && !isAuthApiRoute)) {
    const session = await getSession(request);

    if (!session) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Unauthorized — please log in" },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
