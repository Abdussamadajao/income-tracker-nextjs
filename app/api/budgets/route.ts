// app/api/budgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";
import type { Prisma } from "@/generated/prisma/client";

const budgetItemSchema = z.object({
  category_id: z.string().nullable().default(null),
  income_id: z.string().nullable().default(null),
  amount: z.number().positive(),
  period: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
  start_date: z.iso.datetime(),
});

const bodySchema = z.object({
  budgets: z.array(budgetItemSchema).min(1).max(20),
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const parsed = bodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: z.treeifyError(parsed.error) },
      { status: 422 },
    );
  }

  // verify any provided category_ids belong to this user or are system categories
  const categoryIds = parsed.data.budgets
    .map((b) => b.category_id)
    .filter((id): id is string => id !== null);

  if (categoryIds.length > 0) {
    const validCategories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        OR: [{ user_id: user.id }, { is_system: true }],
      },
      select: { id: true },
    });
    const validIds = new Set(validCategories.map((c) => c.id));
    const invalid = categoryIds.filter((id) => !validIds.has(id));

    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "Invalid category_id(s)", invalid },
        { status: 400 },
      );
    }
  }

  // verify any provided income_ids belong to this user and are INCOME transactions
  const incomeIds = parsed.data.budgets
    .map((b) => b.income_id)
    .filter((id): id is string => id !== null);

  if (incomeIds.length > 0) {
    const validIncomes = await prisma.transaction.findMany({
      where: {
        id: { in: incomeIds },
        user_id: user.id,
        type: "INCOME",
      },
      select: { id: true },
    });
    const validIds = new Set(validIncomes.map((i) => i.id));
    const invalid = incomeIds.filter((id) => !validIds.has(id));

    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error:
            "Invalid income_id(s) - must be income transactions owned by user",
          invalid,
        },
        { status: 400 },
      );
    }
  }

  try {
    const created = await prisma.$transaction(
      parsed.data.budgets.map((b) =>
        prisma.budget.create({
          data: {
            user_id: user.id,
            category_id: b.category_id,
            income_id: b.income_id,
            amount: b.amount,
            period: b.period,
            start_date: new Date(b.start_date),
          },
          include: { category: true, income: true },
        }),
      ),
    );

    authLogger.info(
      { userId: user.id, count: created.length },
      "Batch budgets created",
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    const prismaErr = err as Prisma.PrismaClientKnownRequestError;
    if (prismaErr.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A budget for this category, income source, and period already exists",
        },
        { status: 409 },
      );
    }

    authLogger.error({ err, userId: user.id }, "Failed to create budgets");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
