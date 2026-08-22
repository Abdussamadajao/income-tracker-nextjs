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

const categorySelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
  type: true,
} as const;

const budgetTransactionSelect = {
  id: true,
  type: true,
  amount: true,
  source_name: true,
  notes: true,
  tag: true,
  recorded_at: true,
  created_at: true,
  category: { select: categorySelect },
} as const;

function getBudgetStatus(percentage: number): "healthy" | "warning" | "danger" {
  if (percentage >= 100) return "danger";
  if (percentage >= 80) return "warning";
  return "healthy";
}

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

export const GET = withAuth(
  async (
    req: NextRequest,
    { user, params }: { user: { id: string }; params: { id: string } },
  ) => {
    try {
      const budget = await prisma.budget.findUnique({
        where: { id: params.id },
        include: { category: true, income: true },
      });

      if (!budget || budget.user_id !== user.id) {
        return NextResponse.json(
          { error: "Budget not found" },
          { status: 404 },
        );
      }

      // Calculate spent amount for current period
      const now = new Date();
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

      // Fetch the actual transactions tied to this budget within the period,
      // instead of just the aggregate sum
      const transactions = await prisma.transaction.findMany({
        where: {
          user_id: user.id,
          type: "EXPENSE",
          budget_id: budget.id,
          recorded_at: { gte: start, lt: end },
        },
        select: budgetTransactionSelect,
        orderBy: { recorded_at: "desc" },
      });

      const spent = transactions.reduce(
        (sum, tx) => sum + Number(tx.amount),
        0,
      );
      const budgetAmount = Number(budget.amount);
      const remaining = budgetAmount - spent;
      const percent_used =
        budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

      const summary: {
        id: string;
        name: string;
        icon: string;
        total: number;
        spent: number;
        remaining: number;
        percentage: number;
        status: "healthy" | "warning" | "danger";
      } = {
        id: budget.id,
        name: budget.category?.name ?? "Budget",
        icon: budget.category?.icon ?? "account-balance-wallet",
        total: budgetAmount,
        spent,
        remaining,
        percentage: percent_used,
        status: getBudgetStatus(percent_used),
      };

      const enriched = {
        ...budget,
        amount: budgetAmount,
        transactions,
        spent,
        remaining,
        percent_used,
        is_over_budget: spent > budgetAmount,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        summary,
      };

      return NextResponse.json({ data: enriched });
    } catch (err) {
      authLogger.error(
        { err, userId: user.id, budgetId: params.id },
        "Failed to fetch budget",
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
