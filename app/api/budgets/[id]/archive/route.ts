import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const POST = withAuth(
  async (
    req: NextRequest,
    { user, params }: { user: { id: string }; params: { id: string } },
  ) => {
    const { id } = params;

    const existing = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        {
          error: "Budget not found",
          message: "This budget does not exist or you don't have access to it.",
        },
        { status: 404 },
      );
    }

    if (existing.is_archived) {
      return NextResponse.json(
        {
          error: "Budget already archived",
          message: "This budget has already been archived.",
        },
        { status: 400 },
      );
    }

    try {
      const archived = await prisma.budget.update({
        where: { id },
        data: { is_archived: true, archived_at: new Date() },
        include: { category: true },
      });

      authLogger.info({ userId: user.id, budgetId: id }, "Budget archived");
      return NextResponse.json({ data: archived });
    } catch (err) {
      authLogger.error(
        { err, userId: user.id, budgetId: id },
        "Failed to archive budget",
      );
      return NextResponse.json(
        {
          error: "Internal server error",
          message:
            "Something went wrong while archiving this budget. Please try again.",
        },
        { status: 500 },
      );
    }
  },
);
