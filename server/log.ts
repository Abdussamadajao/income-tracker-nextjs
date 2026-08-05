import pino from "pino";
import config from "./config";
import { NODE_ENV } from "./types/enums";

const isDev = config.nodeEnv === NODE_ENV.DEVELOPMENT;

// ─── Standalone logger (import this anywhere) ─────────────────────────────
export const logger = pino({
  level: isDev ? "debug" : "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
  base: {
    service: "ini-server",
    env: config.nodeEnv,
  },
  // Redact sensitive fields from logs
  redact: {
    paths: [
      "*.password",
      "*.accessToken",
      "*.refreshToken",
      "req.headers.cookie",
      "req.headers.authorization",
    ],
    censor: "[REDACTED]",
  },
});

// ─── Child loggers per module ──────────────────────────────────────────────
export const authLogger = logger.child({ module: "auth" });
export const emailLogger = logger.child({ module: "email" });
export const dbLogger = logger.child({ module: "db" });

// NOTE: the old `httpLogger` export was `hono-pino` middleware, which has
// no equivalent in Next.js Route Handlers. If you want per-request access
// logs, either wrap individual handlers (see `withAuth` in require-auth.ts,
// which already logs unauthorized attempts) or add a small logging call at
// the top of each route handler / in `middleware.ts`.
