import { betterAuth, type BetterAuthOptions } from "better-auth";
import {
  bearer,
  customSession,
  emailOTP,
  openAPI,
  username,
} from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { expo } from "@better-auth/expo";

import config, { NODE_ENV } from "../config";
import { prisma } from "../prisma";
import { schema, usernamePluginSchema } from "./schema";
import { userHooks, usernameGuardPlugin } from "./auth-hooks";
import { betterAuthEmail as betterAuthEmails } from "./email";

const isProd = config.nodeEnv === NODE_ENV.PRODUCTION;

export const auth = betterAuth({
  appName: "ini",
  baseURL: config.betterAuthUrl,
  secret: config.betterAuthSecret,
  trustedOrigins: config.trustedOrigins,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    sendResetPassword: betterAuthEmails.resetPassword,
    resetPasswordTokenExpiresIn: 60 * 10,
  },

  emailVerification: {
    autoSignInAfterVerification: true,
  },
  user: { ...schema.user, deleteUser: { enabled: true } },
  account: { ...schema.account },
  verification: { ...schema.verification },

  session: {
    ...schema.session,
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  advanced: {
    cookiePrefix: "ini",
    cookies: {
      session_token: { name: "ini.session_token" },
    },
    crossSubDomainCookies: isProd
      ? { enabled: true, domain: config.baseDomain }
      : { enabled: false },
    useSecureCookies: isProd,
  },

  databaseHooks: {
    user: userHooks,
  },

  plugins: [
    expo(),
    emailOTP({
      otpLength: 6,
      expiresIn: 60 * 10,
      sendVerificationOTP: betterAuthEmails.sendVerificationOtp,
      overrideDefaultEmailVerification: true,
    }),
    username({
      schema: usernamePluginSchema,
      usernameValidator: (u) => {
        const blocked = ["admin", "ini", "ini", "support", "help", "root"];
        return !blocked.includes(u.toLowerCase());
      },
    }),
    customSession(async ({ user, session }) => {
      return { user, session };
    }),
    bearer(),
    openAPI(),
    usernameGuardPlugin(),
    // Lets `auth.api.*` calls made from Server Actions set cookies on the
    // response automatically. Harmless (and unused) for Route Handlers,
    // where cookies are already set by the handler itself. Must stay last
    // in the plugins array per Better Auth's docs.
    nextCookies(),
  ],
} satisfies BetterAuthOptions);

export type AuthUser = typeof auth.$Infer.Session.user & {
  role: "USER" | "ADMIN";
};
export type AuthSession = typeof auth.$Infer.Session.session;
