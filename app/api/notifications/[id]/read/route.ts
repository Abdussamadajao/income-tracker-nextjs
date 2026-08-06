import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const PATCH = withAuth(
  async (_req, { user, params }) => {
    const { id } = params;

    try {
      const existing = await prisma.notification.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.notification.update({
        where: { id },
        data: { read: true },
      });

      return NextResponse.json({ data: { marked_read: true } });
    } catch (err) {
      authLogger.error(
        { err, userId: user.id },
        "Failed to mark notification read",
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
