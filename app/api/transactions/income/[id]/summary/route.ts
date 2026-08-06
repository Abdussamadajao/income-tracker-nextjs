import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma, Decimal } from "@/server/prisma";
import { authLogger } from "@/server/log";

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

export const GET = withAuth(
  async (_req, { user, params }) => {
    const { id } = params;

    try {
      const income = await prisma.transaction.findUnique({
        where: { id },
        include: {
          category: { select: categorySelect },
          expenses: {
            select: expenseSelect,
            orderBy: { recorded_at: "desc" },
          },
        },
      });

      if (!income) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }

      if (income.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (income.type !== "INCOME") {
        return NextResponse.json(
          { error: "Not an income transaction" },
          { status: 400 },
        );
      }

      return NextResponse.json({
        data: {
          ...income,
          summary: computeSummary(income.amount, income.expenses),
        },
      });
    } catch (err) {
      authLogger.error(
        { err, userId: user.id },
        "Failed to fetch income summary",
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
