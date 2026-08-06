import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const take = Number(req.nextUrl.searchParams.get("limit") ?? 5);

  try {
    const recent = await prisma.transaction.findMany({
      where: { user_id: user.id },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: { recorded_at: "desc" },
      take,
    });

    return NextResponse.json({
      data: recent.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        source_name: tx.source_name,
        category: tx.category,
        recorded_at: tx.recorded_at,
      })),
    });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch user activity");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
