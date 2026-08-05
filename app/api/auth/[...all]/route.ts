import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Replaces the Hono mount:
//   app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
//
// `toNextJsHandler` wires the same `auth.handler` up to Next.js's Route
// Handler signature — every Better Auth endpoint (sign-in, sign-up, OTP,
// session, etc.) is served from this single catch-all route.
export const { GET, POST } = toNextJsHandler(auth);
