import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const POST = withAuth(
  async (
    req: NextRequest,
    { user, params }: { user: { id: string }; params: { id: string } },
  ) => {
    const existing = await prisma.budget.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    if (existing.is_archived) {
      return NextResponse.json(
        { error: "Budget is already archived" },
        { status: 400 },
      );
    }

    try {
      const archived = await prisma.budget.update({
        where: { id: params.id },
        data: { is_archived: true, archived_at: new Date() },
        include: { category: true },
      });

      authLogger.info(
        { userId: user.id, budgetId: params.id },
        "Budget archived",
      );
      return NextResponse.json({ data: archived });
    } catch (err) {
      authLogger.error(
        { err, userId: user.id, budgetId: params.id },
        "Failed to archive budget",
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
