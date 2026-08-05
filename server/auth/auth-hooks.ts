import {
  type BetterAuthPlugin,
  type GenericEndpointContext,
  type Session,
  type User as BetterAuthUser,
} from "better-auth";
import { createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { authLogger } from "../log";
import { generateId } from "../utils";

type iniUser = BetterAuthUser & {
  phone: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type UserInput = BetterAuthUser & Record<string, unknown>;
type UserUpdateInput = Partial<BetterAuthUser> & Record<string, unknown>;

// ─── User lifecycle hooks ─────────────────────────────────────────────────
export const userHooks = {
  create: {
    before: async (user: UserInput, _ctx: GenericEndpointContext | null) => {
      const u = user as iniUser;
      const firstName = u.name?.split(" ")[0] || "";
      const lastName = u.name?.split(" ")[1] || "";

      const username = u.username
        ? u.username
        : `${firstName}.${lastName}.${generateId(4)}`.toLowerCase();

      authLogger.debug({ email: u.email, username }, "Creating user");

      return {
        data: {
          ...user,
          username,
        },
      };
    },

    after: async (user: UserInput, _ctx: GenericEndpointContext | null) => {
      const u = user as iniUser;
      authLogger.info({ userId: u.id, email: u.email }, "User created");
    },
  },

  update: {
    before: async (
      user: UserUpdateInput,
      _ctx: GenericEndpointContext | null,
    ) => {
      const u = user as Partial<iniUser>;
      authLogger.debug({ userId: u.id }, "Updating user");
      return { data: user };
    },

    after: async (user: UserInput, _ctx: GenericEndpointContext | null) => {
      const u = user as iniUser;
      authLogger.info({ userId: u.id }, "User updated");
    },
  },
};

// ─── Username conflict guard plugin ──────────────────────────────────────
// Prevents updating to a username that's already taken
export function usernameGuardPlugin(): BetterAuthPlugin {
  return {
    id: "ini-username-guard",
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === "/update-user",
          handler: createAuthMiddleware(async (ctx) => {
            const session = await getSessionFromCtx(ctx);
            const body = ctx.body as Record<string, unknown>;

            if (!session) return { context: ctx };

            if (body?.username && body.username !== session.user.username) {
              authLogger.debug(
                { userId: session.user.id, newUsername: body.username },
                "Username change requested",
              );
            }

            return { context: ctx };
          }),
        },
      ],
    },
  };
}

// ─── Custom session enrichment ────────────────────────────────────────────
// Adds ini-specific fields to every session response
export function customSession({
  user,
  session,
}: {
  user: BetterAuthUser;
  session: Session;
}) {
  // Better Auth already merges additionalFields into user
  // This is where you'd attach extra computed fields if needed
  return {
    user: {
      ...user,
      displayName: user.name,
    },
    session,
  };
}
