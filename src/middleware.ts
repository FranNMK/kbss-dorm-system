import type { NextRequest } from "next/server";
import { auth0 } from "./lib/auth0";

// Auth0 v4 uses Node.js APIs (not Edge Runtime compatible)
export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
