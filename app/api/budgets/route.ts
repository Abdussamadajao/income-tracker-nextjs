// app/api/budgets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/server/require-auth";
import { prisma, Decimal } from "@/server/prisma";
import { authLogger } from "@/server/log";
import type { Prisma } from "@/generated/prisma/client";

type DecimalType = InstanceType<typeof Decimal>;

function toNumber(value: DecimalType | string | number): number {
  if (value instanceof Decimal) return value.toNumber();
  return Number(value);
}

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

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period");
  const category_id = sp.get("category_id");
  const income_id = sp.get("income_id");
  const archived = sp.get("archived");

  try {
    const where: Prisma.BudgetWhereInput = {
      user_id: user.id,
      ...(period && { period: period as "WEEKLY" | "MONTHLY" | "YEARLY" }),
      ...(category_id && { category_id }),
      ...(income_id && { income_id }),
      ...(archived === "true" && { is_archived: true }),
      ...(archived === "false" && { is_archived: false }),
    };

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: true,
        income: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Calculate spent amounts for each budget based on current period
    const enriched = await Promise.all(
      budgets.map(async (budget) => {
        const now = new Date();

        // Calculate period boundaries based on budget period
        let start: Date;
        let end: Date;

        if (budget.period === "WEEKLY") {
          start = new Date(now);
          start.setDate(now.getDate() - now.getDay());
          start.setHours(0, 0, 0, 0);
          end = new Date(start);
          end.setDate(start.getDate() + 7);
        } else if (budget.period === "MONTHLY") {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else {
          // YEARLY
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear() + 1, 0, 1);
        }

        const where: Prisma.TransactionWhereInput = {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: start, lt: end },
          budget_id: budget.id,
        };

        const result = await prisma.transaction.aggregate({
          where,
          _sum: { amount: true },
        });

        const spent = toNumber(result._sum.amount ?? 0);
        const budgetAmount = toNumber(budget.amount);
        const remaining = budgetAmount - spent;
        const percent_used =
          budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

        return {
          ...budget,
          spent,
          remaining,
          percent_used,
          period_start: start.toISOString(),
          period_end: end.toISOString(),
        };
      }),
    );

    return NextResponse.json({ data: enriched });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch budgets");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
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
