import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma, Decimal } from "@/server/prisma";
import { authLogger } from "@/server/log";
import { notifyLowBalance, notifyTransactionAdded } from "@/server/push";
import type { CreateTransactionBody } from "@/server/types";

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
const budgetSelect = {
  id: true,
  amount: true,
  period: true,
  category: { select: categorySelect },
  income: { select: incomeSelect },
} as const;
const transactionInclude = {
  category: { select: categorySelect },
  income: { select: incomeSelect },
  expenses: {
    select: expenseSelect,
    orderBy: { recorded_at: "desc" as const },
  },
  budget: {
    select: budgetSelect,
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

const MAX_BATCH_SIZE = 20;

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body: { transactions: CreateTransactionBody[] } = await req.json();

    if (!Array.isArray(body.transactions) || body.transactions.length === 0) {
      return NextResponse.json(
        { error: "transactions must be a non-empty array" },
        { status: 400 },
      );
    }

    if (body.transactions.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `Cannot submit more than ${MAX_BATCH_SIZE} transactions at once`,
        },
        { status: 400 },
      );
    }

    // ── Per-item shape validation ────────────────────────────────────────
    for (const [index, item] of body.transactions.entries()) {
      if (
        !item.type ||
        !item.amount ||
        !item.category_id ||
        !item.recorded_at
      ) {
        return NextResponse.json(
          {
            error: `transactions[${index}]: type, amount, category_id and recorded_at are required`,
          },
          { status: 400 },
        );
      }

      if (!["INCOME", "EXPENSE"].includes(item.type)) {
        return NextResponse.json(
          { error: `transactions[${index}]: type must be INCOME or EXPENSE` },
          { status: 400 },
        );
      }

      if (item.amount <= 0) {
        return NextResponse.json(
          { error: `transactions[${index}]: amount must be greater than 0` },
          { status: 400 },
        );
      }
    }

    // ── Validate categories (ownership + type match) in bulk ────────────
    const categoryIds = [
      ...new Set(body.transactions.map((t) => t.category_id)),
    ];
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        OR: [{ is_system: true }, { user_id: user.id }],
      },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    for (const [index, item] of body.transactions.entries()) {
      const category = categoryMap.get(item.category_id);
      if (!category) {
        return NextResponse.json(
          { error: `transactions[${index}]: Category not found` },
          { status: 404 },
        );
      }
      if (category.type !== item.type) {
        return NextResponse.json(
          {
            error: `transactions[${index}]: Category is for ${category.type} transactions`,
          },
          { status: 400 },
        );
      }
    }

    // ── Validate income_id references (ownership + running balance) ─────
    // Tracked cumulatively so multiple EXPENSE rows in the same batch that
    // draw from the same income source can't collectively overspend it,
    // even though no single row would exceed the balance on its own.
    const incomeIds = [
      ...new Set(
        body.transactions
          .filter((t) => t.type === "EXPENSE" && t.income_id)
          .map((t) => t.income_id as string),
      ),
    ];

    const incomeRemaining = new Map<string, number>();

    if (incomeIds.length > 0) {
      const incomes = await prisma.transaction.findMany({
        where: { id: { in: incomeIds } },
        include: { expenses: { select: { amount: true } } },
      });
      const incomeMap = new Map(incomes.map((i) => [i.id, i]));

      for (const [index, item] of body.transactions.entries()) {
        if (item.type !== "EXPENSE" || !item.income_id) continue;

        const income = incomeMap.get(item.income_id);
        if (!income) {
          return NextResponse.json(
            { error: `transactions[${index}]: Income source not found` },
            { status: 404 },
          );
        }
        if (income.user_id !== user.id) {
          return NextResponse.json(
            { error: `transactions[${index}]: Forbidden` },
            { status: 403 },
          );
        }
        if (income.type !== "INCOME") {
          return NextResponse.json(
            {
              error: `transactions[${index}]: income_id must reference an INCOME transaction`,
            },
            { status: 400 },
          );
        }

        if (!incomeRemaining.has(income.id)) {
          const summary = computeSummary(income.amount, income.expenses);
          incomeRemaining.set(income.id, summary.remaining);
        }

        const remaining = incomeRemaining.get(income.id)!;
        if (item.amount > remaining) {
          return NextResponse.json(
            {
              error: `transactions[${index}]: Insufficient balance`,
              details: { remaining, requested: item.amount },
            },
            { status: 422 },
          );
        }

        incomeRemaining.set(income.id, remaining - item.amount);
      }
    }

    // ── Validate budget_id references (ownership + not archived) ─────
    const budgetIds = [
      ...new Set(
        body.transactions
          .filter((t) => t.type === "EXPENSE" && t.budget_id)
          .map((t) => t.budget_id as string),
      ),
    ];

    if (budgetIds.length > 0) {
      const budgets = await prisma.budget.findMany({
        where: {
          id: { in: budgetIds },
          user_id: user.id,
          is_archived: false,
        },
      });
      const budgetMap = new Map(budgets.map((b) => [b.id, b]));

      for (const [index, item] of body.transactions.entries()) {
        if (item.type !== "EXPENSE" || !item.budget_id) continue;

        const budget = budgetMap.get(item.budget_id);
        if (!budget) {
          return NextResponse.json(
            {
              error: `transactions[${index}]: Budget not found or is archived`,
            },
            { status: 404 },
          );
        }
      }
    }

    // ── Create all rows atomically ───────────────────────────────────────
    const created = await prisma.$transaction(
      body.transactions.map((item) =>
        prisma.transaction.create({
          data: {
            type: item.type,
            amount: item.amount,
            category_id: item.category_id,
            user_id: user.id,
            income_id:
              item.type === "EXPENSE" ? (item.income_id ?? null) : null,
            budget_id:
              item.type === "EXPENSE" ? (item.budget_id ?? null) : null,
            source_name: item.source_name ?? null,
            notes: item.notes ?? null,
            receipt_url: item.receipt_url ?? null,
            tag: item.tag ?? null,
            recorded_at: new Date(item.recorded_at),
          },
          include: transactionInclude,
        }),
      ),
    );

    authLogger.info(
      { userId: user.id, count: created.length },
      "Batch transactions created",
    );

    // ── Fire-and-forget notifications ────────────────────────────────────
    for (const tx of created) {
      void notifyTransactionAdded(
        user.id,
        tx.type,
        toNumber(tx.amount),
        tx.source_name ?? tx.type,
      );
    }

    // Recompute low-balance state once per affected income source, not per
    // expense row, so a batch with 3 expenses against the same income only
    // triggers one notification check.
    for (const incomeId of incomeIds) {
      const updated = await prisma.transaction.findUnique({
        where: { id: incomeId },
        include: { expenses: { select: { amount: true } } },
      });
      if (!updated) continue;

      const summary = computeSummary(updated.amount, updated.expenses);
      if (summary.percentage >= 80) {
        void notifyLowBalance(
          user.id,
          updated.source_name ?? "Income source",
          summary.remaining,
          summary.percentage,
        );
      }
    }

    const data = created.map((tx) =>
      tx.type === "INCOME"
        ? { ...tx, summary: computeSummary(tx.amount, tx.expenses) }
        : tx,
    );

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    authLogger.error(
      { err, userId: user.id },
      "Failed to create batch transactions",
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
