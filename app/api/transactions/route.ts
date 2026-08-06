import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma, Decimal } from "@/server/prisma";
import { authLogger } from "@/server/log";
import { notifyLowBalance, notifyTransactionAdded } from "@/server/push";
import type { CreateTransactionBody } from "@/server/types";
import type { Prisma } from "@/generated/prisma/client";

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

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const from = sp.get("from");
  const to = sp.get("to");
  const categoryIds = sp.get("categoryIds");
  const amountMin = sp.get("amountMin");
  const amountMax = sp.get("amountMax");
  const income_id = sp.get("income_id");
  const q = sp.get("q");
  const page = sp.get("page") ?? "1";
  const pageSize = sp.get("pageSize") ?? "20";

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  try {
    const where: Prisma.TransactionWhereInput = {
      user_id: user.id,

      ...(type && { type: type as "INCOME" | "EXPENSE" }),
      ...(income_id && { income_id }),

      ...((from || to) && {
        recorded_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),

      ...(categoryIds && {
        category_id: { in: categoryIds.split(",") },
      }),

      ...((amountMin || amountMax) && {
        amount: {
          ...(amountMin && { gte: new Decimal(amountMin) }),
          ...(amountMax && { lte: new Decimal(amountMax) }),
        },
      }),

      ...(q && {
        OR: [
          { source_name: { contains: q, mode: "insensitive" as const } },
          { notes: { contains: q, mode: "insensitive" as const } },
          { category: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy: { recorded_at: "desc" },
        skip,
        take,
      }),
      prisma.transaction.count({ where }),
    ]);

    const enriched = data.map((tx) => {
      if (tx.type !== "INCOME") return tx;
      return { ...tx, summary: computeSummary(tx.amount, tx.expenses) };
    });

    return NextResponse.json({
      data: enriched,
      meta: {
        total,
        page: Number(page),
        pageSize: take,
        pageCount: Math.ceil(total / take),
      },
    });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch transactions");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (req, { user }) => {
  try {
    const body: CreateTransactionBody = await req.json();

    if (!body.type || !body.amount || !body.category_id || !body.recorded_at) {
      return NextResponse.json(
        { error: "type, amount, category_id and recorded_at are required" },
        { status: 400 },
      );
    }

    if (!["INCOME", "EXPENSE"].includes(body.type)) {
      return NextResponse.json(
        { error: "type must be INCOME or EXPENSE" },
        { status: 400 },
      );
    }

    if (body.amount <= 0) {
      return NextResponse.json(
        { error: "amount must be greater than 0" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findFirst({
      where: {
        id: body.category_id,
        OR: [{ is_system: true }, { user_id: user.id }],
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category.type !== body.type) {
      return NextResponse.json(
        { error: `Category is for ${category.type} transactions` },
        { status: 400 },
      );
    }

    if (body.type === "EXPENSE" && body.income_id) {
      const income = await prisma.transaction.findUnique({
        where: { id: body.income_id },
        include: { expenses: { select: { amount: true } } },
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

      if (body.amount > summary.remaining) {
        return NextResponse.json(
          {
            error: "Insufficient balance",
            details: {
              total: summary.total,
              spent: summary.spent,
              remaining: summary.remaining,
              requested: body.amount,
            },
          },
          { status: 422 },
        );
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: body.type,
        amount: body.amount,
        category_id: body.category_id,
        user_id: user.id,
        income_id: body.type === "EXPENSE" ? (body.income_id ?? null) : null,
        source_name: body.source_name ?? null,
        notes: body.notes ?? null,
        receipt_url: body.receipt_url ?? null,
        tag: body.tag ?? null,
        recorded_at: new Date(body.recorded_at),
      },
      include: transactionInclude,
    });

    authLogger.info(
      { userId: user.id, transactionId: transaction.id, type: body.type },
      "Transaction created",
    );

    void notifyTransactionAdded(
      user.id,
      body.type,
      body.amount,
      body.source_name ?? body.type,
    );

    if (body.type === "EXPENSE" && body.income_id) {
      const updated = await prisma.transaction.findUnique({
        where: { id: body.income_id },
        include: { expenses: { select: { amount: true } } },
      });

      if (updated) {
        const total = toNumber(updated.amount);
        const spent = updated.expenses.reduce(
          (sum, expense) => sum + toNumber(expense.amount),
          0,
        );
        const percentage = total > 0 ? Math.round((spent / total) * 100) : 0;

        if (percentage >= 80) {
          void notifyLowBalance(
            user.id,
            updated.source_name ?? "Income source",
            total - spent,
            percentage,
          );
        }
      }
    }

    const data =
      transaction.type === "INCOME"
        ? {
            ...transaction,
            summary: computeSummary(transaction.amount, transaction.expenses),
          }
        : transaction;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to create transaction");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
