import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

const updateBudgetSchema = z.object({
  amount: z.number().positive().optional(),
  category_id: z.string().nullable().optional(),
  income_id: z.string().nullable().optional(),
  period: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  start_date: z.iso.datetime().optional(),
});

export const PUT = withAuth(
  async (
    req: NextRequest,
    { user, params }: { user: { id: string }; params: { id: string } },
  ) => {
    const parsed = updateBudgetSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: z.treeifyError(parsed.error) },
        { status: 422 },
      );
    }

    const existing = await prisma.budget.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    if (existing.is_archived) {
      return NextResponse.json(
        { error: "Cannot update an archived budget" },
        { status: 400 },
      );
    }

    // validate category_id if provided
    if (
      parsed.data.category_id !== undefined &&
      parsed.data.category_id !== null
    ) {
      const validCategory = await prisma.category.findFirst({
        where: {
          id: parsed.data.category_id,
          OR: [{ user_id: user.id }, { is_system: true }],
        },
        select: { id: true },
      });
      if (!validCategory) {
        return NextResponse.json(
          { error: "Invalid category_id" },
          { status: 400 },
        );
      }
    }

    // validate income_id if provided
    if (parsed.data.income_id !== undefined && parsed.data.income_id !== null) {
      const validIncome = await prisma.transaction.findFirst({
        where: {
          id: parsed.data.income_id,
          user_id: user.id,
          type: "INCOME",
        },
        select: { id: true },
      });
      if (!validIncome) {
        return NextResponse.json(
          {
            error:
              "Invalid income_id - must be an income transaction owned by user",
          },
          { status: 400 },
        );
      }
    }

    try {
      const updated = await prisma.budget.update({
        where: { id: params.id },
        data: {
          ...(parsed.data.amount !== undefined && {
            amount: parsed.data.amount,
          }),
          ...(parsed.data.category_id !== undefined && {
            category_id: parsed.data.category_id,
          }),
          ...(parsed.data.income_id !== undefined && {
            income_id: parsed.data.income_id,
          }),
          ...(parsed.data.period !== undefined && {
            period: parsed.data.period,
          }),
          ...(parsed.data.start_date !== undefined && {
            start_date: new Date(parsed.data.start_date),
          }),
        },
        include: { category: true, income: true },
      });

      authLogger.info(
        { userId: user.id, budgetId: params.id },
        "Budget updated",
      );
      return NextResponse.json({ data: updated });
    } catch (err) {
      authLogger.error(
        { err, userId: user.id, budgetId: params.id },
        "Failed to update budget",
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
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

    try {
      await prisma.budget.delete({ where: { id: params.id } });

      authLogger.info(
        { userId: user.id, budgetId: params.id },
        "Budget deleted",
      );
      return NextResponse.json({ data: { id: params.id, deleted: true } });
    } catch (err) {
      authLogger.error(
        { err, userId: user.id, budgetId: params.id },
        "Failed to delete budget",
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
