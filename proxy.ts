import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// OPTIONAL. Hono's version ran a real `auth.api.getSession()` DB lookup on
// every request via `app.use("*", ...)`. Next.js middleware runs on the
// Edge runtime, where a Prisma/Postgres call like that either isn't
// supported or adds latency to every request — so Better Auth recommends
// doing only a cheap "is there a session cookie at all" check here, and
// leaving the real, authoritative check to `withAuth` in the Route
// Handlers (see require-auth.ts) or to `getAuthSession()` in Server
// Components. This just lets you bounce obviously-signed-out users away
// from protected *pages* before they render.
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: "ini",
  });

  const isProtectedPage = request.nextUrl.pathname.startsWith("/dashboard");

  if (isProtectedPage && !sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

// Only run on page routes you actually want gated — API routes protect
// themselves via `withAuth`, so there's no need to match /api/* here.
export const config = {
  matcher: ["/dashboard/:path*"],
};
