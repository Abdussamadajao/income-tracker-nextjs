import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const pageSize = Number(req.nextUrl.searchParams.get("pageSize") ?? 20);
  const unread = req.nextUrl.searchParams.get("unread");

  const skip = (page - 1) * pageSize;

  try {
    const where = {
      user_id: user.id,
      ...(unread === "true" && { read: false }),
    };

    const [data, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { user_id: user.id, read: false },
      }),
    ]);

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        unread_count: unreadCount,
      },
    });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch notifications");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(async (_req, { user }) => {
  try {
    await prisma.notification.updateMany({
      where: { user_id: user.id, read: false },
      data: { read: true },
    });

    return NextResponse.json({ data: { marked_read: true } });
  } catch (err) {
    authLogger.error(
      { err, userId: user.id },
      "Failed to mark notifications read",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
