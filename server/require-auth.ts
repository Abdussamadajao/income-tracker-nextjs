import { NextRequest, NextResponse } from "next/server";
import { auth, type AuthSession, type AuthUser } from "./auth";
import { authLogger } from "./log";
import { prisma } from "./prisma";

// ─── Types ──────────────────────────────────────────────────────────────
// Next.js Route Handlers don't have Hono's `c.set()/c.get()` context, and
// there's no per-router `.use()` middleware chain — each route.ts file is
// its own isolated handler. So instead of:
//
//   user.use("/*", requireAuth);
//   user.get("/profile", (c) => { const me = c.get("user"); ... });
//
// we wrap each handler in a small HOF that does the session lookup once
// and passes the result straight in as an extra argument.

export type AuthedHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  ctx: {
    params: TParams;
    user: AuthUser;
    session: AuthSession;
  },
) => Promise<Response> | Response;

type NextRouteContext<TParams> = {
  params: Promise<TParams>;
};

/**
 * Wrap a Route Handler so it 401s automatically when there's no session,
 * and receives `user`/`session` typed and ready to use otherwise.
 *
 * @example
 * // app/api/user/profile/route.ts
 * export const GET = withAuth(async (req, { user }) => {
 *   const profile = await prisma.user.findUnique({ where: { id: user.id } });
 *   return NextResponse.json({ data: profile });
 * });
 */
export function withAuth<TParams = Record<string, string>>(
  handler: AuthedHandler<TParams>,
) {
  return async (req: NextRequest, ctx: NextRouteContext<TParams>) => {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
      authLogger.warn({ path: req.nextUrl.pathname }, "Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!dbUser) {
      authLogger.warn({ userId: session.user.id }, "User not found in database");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await ctx.params;

    return handler(req, {
      params,
      user: { ...session.user, role: dbUser.role } as AuthUser,
      session: session.session,
    });
  };
}

/**
 * Same as `withAuth`, but also requires `user.role === "admin"`. Signed-in
 * non-admins get a 403 (not a 401 — they *are* authenticated, they just
 * don't have permission), signed-out requests still get a 401.
 *
 * @example
 * // app/api/admin/users/route.ts
 * export const GET = withAdminAuth(async (req, { user }) => {
 *   const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
 *   return NextResponse.json({ data: users });
 * });
 */
export function withAdminAuth<TParams = Record<string, string>>(
  handler: AuthedHandler<TParams>,
) {
  return withAuth<TParams>(async (req, ctx) => {
    if (ctx.user.role !== "ADMIN") {
      authLogger.warn(
        { userId: ctx.user.id, path: req.nextUrl.pathname },
        "Forbidden: admin-only route",
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, ctx);
  });
}

/**
 * For places that aren't a Route Handler (Server Components, Server
 * Actions) but still need the current session — e.g. a page or layout
 * that reads `user` to render account info. Returns `null` if signed out
 * instead of throwing, so callers decide how to handle it (redirect,
 * render a signed-out state, etc.).
 *
 * @example
 * import { headers } from "next/headers";
 * const session = await getAuthSession(await headers());
 */
export async function getAuthSession(requestHeaders: Headers) {
  return auth.api.getSession({ headers: requestHeaders });
}
