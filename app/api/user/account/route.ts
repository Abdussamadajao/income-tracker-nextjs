import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const DELETE = withAuth(async (_req, { user }) => {
  try {
    await prisma.pushToken.deleteMany({ where: { user_id: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    authLogger.info({ userId: user.id }, "Account deleted");

    return new Response(null, { status: 204 });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to delete account");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
