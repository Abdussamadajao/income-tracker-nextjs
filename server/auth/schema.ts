export const schema = {
  user: {
    modelName: "user",
    fields: {
      name: "name",
      emailVerified: "emailVerified",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
    additionalFields: {
      phone: {
        type: "string",
        required: false,
      },
      username: {
        type: "string",
        required: false,
      },
      bio: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        // Never let a client set/change their own role via update-user —
        // only the DB / an internal script should be able to promote
        // someone to admin.
        input: false,
      },
    },
  },
  session: {
    modelName: "session",
    fields: {
        expiresAt: "expiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      ipAddress: "ipAddress",
      userAgent: "userAgent",
      userId: "userId",
    },
  },
  account: {
    modelName: "account",
    fields: {
      accountId: "accountId",
      providerId: "providerId",
      userId: "userId",
      accessToken: "accessToken",
      refreshToken: "refreshToken",
      idToken: "idToken",
      accessTokenExpiresAt: "accessTokenExpiresAt",
      refreshTokenExpiresAt: "refreshTokenExpiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
  verification: {
    modelName: "verification",
    fields: {
      expiresAt: "expiresAt",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
} as const;

/** Maps username plugin fields to Prisma `User` columns (not the full `user` config). */
export const usernamePluginSchema = {
  user: {
    fields: {
      username: "username",
      displayUsername: "displayUsername",
    },
  },
} as const;
