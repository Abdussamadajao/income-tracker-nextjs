import process from "node:process";

export const NODE_ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;
export type NodeEnv = (typeof NODE_ENV)[keyof typeof NODE_ENV];

interface Config {
  port: number;
  nodeEnv: NodeEnv;
  databaseUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  baseDomain: string;
  trustedOrigins: string[];
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    from: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
  };
}

// NOTE: In Next.js this file only ever runs on the server (imported from
// Route Handlers / Server Components / server-only libs), so reading
// `process.env` directly here is safe. Never import this file from a
// "use client" component.
export const createConfig = (): Config => {
  const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"];

  if (!process.env.CI) {
    required.forEach((key) => {
      if (!process.env[key]) throw new Error(`Missing required env: ${key}`);
    });
  }

  return {
    // Next.js dev server defaults to 3000 (was 4000 for the standalone Hono app)
    port: Number(process.env.PORT) || 3000,
    nodeEnv: (process.env.NODE_ENV as Config["nodeEnv"]) || "development",
    databaseUrl: process.env.DATABASE_URL || "",

    betterAuthSecret: process.env.BETTER_AUTH_SECRET || "",
    betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [
      "ini://",
      "exp://",
      "exp://**",
    ],
    baseDomain: process.env.BASE_DOMAIN || "localhost",
    smtp: {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
      from: process.env.SMTP_FROM || "ini <[email protected]>",
    },

    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  };
};

const config = createConfig();
export default config;
