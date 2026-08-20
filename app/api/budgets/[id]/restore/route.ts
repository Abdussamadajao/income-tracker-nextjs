import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const POST = withAuth(
  async (
    req: NextRequest,
    { user, params }: { user: { id: string }; params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;

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

    if (!existing.is_archived) {
      return NextResponse.json(
        {
          error: "Budget is not archived",
          message: "This budget is already active.",
        },
        { status: 400 },
      );
    }

    try {
      // restoring can collide with an active budget that now occupies the
      // same category+period slot — the partial unique index will reject
      // this at the DB level, so surface that as a clean 409 instead of 500
      const restored = await prisma.budget.update({
        where: { id },
        data: { is_archived: false, archived_at: null },
        include: { category: true },
      });

      authLogger.info({ userId: user.id, budgetId: id }, "Budget restored");

      return NextResponse.json({ data: restored });
    } catch (err) {
      const prismaErr = err as { code?: string };

      if (prismaErr.code === "P2002") {
        return NextResponse.json(
          {
            error: "Active budget already exists",
            message:
              "You already have an active budget for this category and period. Archive or delete it first.",
          },
          { status: 409 },
        );
      }

      authLogger.error(
        { err, userId: user.id, budgetId: id },
        "Failed to restore budget",
      );

      return NextResponse.json(
        {
          error: "Internal server error",
          message:
            "Something went wrong while restoring this budget. Please try again.",
        },
        { status: 500 },
      );
    }
  },
);
