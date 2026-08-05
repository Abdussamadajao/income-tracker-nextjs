import { NextResponse } from "next/server";
import { withAdminAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

// ─── GET /api/admin/users ───────────────────────────────────────────────
// Signed-out            → 401 (from withAuth, via withAdminAuth)
// Signed in, role=user  → 403 (from withAdminAuth)
// Signed in, role=admin → 200, list of users

export const GET = withAdminAuth(async (req, { user }) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    authLogger.debug(
      { adminId: user.id, count: users.length },
      "Admin listed users",
    );

    return NextResponse.json({ data: users });
  } catch (err) {
    authLogger.error({ err, adminId: user.id }, "Failed to list users");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
