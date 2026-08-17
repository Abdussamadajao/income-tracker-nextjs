import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma, Decimal } from "@/server/prisma";
import { authLogger } from "@/server/log";
import type { UpdateTransactionBody } from "@/server/types";

type DecimalType = InstanceType<typeof Decimal>;

const categorySelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
  type: true,
} as const;

const expenseSelect = {
  id: true,
  amount: true,
  source_name: true,
  notes: true,
  tag: true,
  recorded_at: true,
  created_at: true,
  category: { select: categorySelect },
} as const;

const incomeSelect = {
  id: true,
  amount: true,
  source_name: true,
  notes: true,
  tag: true,
  recorded_at: true,
  created_at: true,
  category: { select: categorySelect },
} as const;

const transactionInclude = {
  category: { select: categorySelect },
  income: { select: incomeSelect },
  expenses: {
    select: expenseSelect,
    orderBy: { recorded_at: "desc" as const },
  },
  budget: {
    select: {
      id: true,
      amount: true,
      period: true,
      category: { select: categorySelect },
      income: { select: incomeSelect },
    },
  },
} as const;

function toNumber(value: DecimalType | string | number): number {
  if (value instanceof Decimal) return value.toNumber();
  return Number(value);
}

function computeSummary(
  amount: DecimalType | string | number,
  expenses: { amount: DecimalType | string | number }[],
) {
  const total = toNumber(amount);
  const spent = expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);
  const remaining = total - spent;
  const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;
  return { total, spent, remaining, percentage };
}

export const GET = withAuth(async (_req, { user, params }) => {
  const { id } = params;

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (transaction.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data =
      transaction.type === "INCOME"
        ? {
            ...transaction,
            summary: computeSummary(transaction.amount, transaction.expenses),
          }
        : transaction;

    return NextResponse.json({ data });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch transaction");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = params;

  try {
    const existing = await prisma.transaction.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: UpdateTransactionBody = await req.json();

    if (body.amount !== undefined && body.amount <= 0) {
      return NextResponse.json(
        { error: "amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (body.category_id) {
      const category = await prisma.category.findFirst({
        where: {
          id: body.category_id,
          OR: [{ is_system: true }, { user_id: user.id }],
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }

      if (category.type !== existing.type) {
        return NextResponse.json(
          { error: `Category is for ${category.type} transactions` },
          { status: 400 },
        );
      }
    }

    if (body.income_id && existing.type === "EXPENSE") {
      const income = await prisma.transaction.findUnique({
        where: { id: body.income_id },
        include: {
          expenses: {
            where: { NOT: { id } },
            select: { amount: true },
          },
        },
      });

      if (!income) {
        return NextResponse.json(
          { error: "Income source not found" },
          { status: 404 },
        );
      }

      if (income.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (income.type !== "INCOME") {
        return NextResponse.json(
          { error: "income_id must reference an INCOME transaction" },
          { status: 400 },
        );
      }

      const summary = computeSummary(income.amount, income.expenses);
      const newAmount = body.amount ?? toNumber(existing.amount);

      if (newAmount > summary.remaining) {
        return NextResponse.json(
          {
            error: "Insufficient balance",
            details: {
              total: summary.total,
              spent: summary.spent,
              remaining: summary.remaining,
              requested: newAmount,
            },
          },
          { status: 422 },
        );
      }
    }

    // Validate budget_id if provided
    if (body.budget_id !== undefined && body.budget_id !== null) {
      const budget = await prisma.budget.findFirst({
        where: {
          id: body.budget_id,
          user_id: user.id,
          is_archived: false,
        },
      });

      if (!budget) {
        return NextResponse.json(
          { error: "Budget not found or is archived" },
          { status: 404 },
        );
      }
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.category_id !== undefined && {
          category_id: body.category_id,
        }),
        ...(body.income_id !== undefined && { income_id: body.income_id }),
        ...(body.budget_id !== undefined && { budget_id: body.budget_id }),
        ...(body.source_name !== undefined && {
          source_name: body.source_name,
        }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.receipt_url !== undefined && {
          receipt_url: body.receipt_url,
        }),
        ...(body.tag !== undefined && { tag: body.tag }),
        ...(body.recorded_at !== undefined && {
          recorded_at: new Date(body.recorded_at),
        }),
      },
      include: transactionInclude,
    });

    authLogger.info(
      { userId: user.id, transactionId: id },
      "Transaction updated",
    );

    const data =
      updated.type === "INCOME"
        ? {
            ...updated,
            summary: computeSummary(updated.amount, updated.expenses),
          }
        : updated;

    return NextResponse.json({ data });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to update transaction");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const DELETE = withAuth(async (_req, { user, params }) => {
  const { id } = params;

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { expenses: { select: { id: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existing.type === "INCOME" && existing.expenses.length > 0) {
      await prisma.transaction.updateMany({
        where: { income_id: id },
        data: { income_id: null },
      });
    }

    await prisma.transaction.delete({ where: { id } });

    authLogger.info(
      { userId: user.id, transactionId: id },
      "Transaction deleted",
    );

    return new Response(null, { status: 204 });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to delete transaction");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
