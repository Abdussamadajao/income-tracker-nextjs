import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

export const GET = withAuth(async (_req, { user }) => {
  try {
    const [totalIncome, totalExpenses, totalTransactions, totalCategories] =
      await Promise.all([
        prisma.transaction.aggregate({
          where: { user_id: user.id, type: "INCOME" },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { user_id: user.id, type: "EXPENSE" },
          _sum: { amount: true },
        }),
        prisma.transaction.count({
          where: { user_id: user.id },
        }),
        prisma.category.count({
          where: { user_id: user.id, is_system: false },
        }),
      ]);

    const income = Number(totalIncome._sum.amount ?? 0);
    const expenses = Number(totalExpenses._sum.amount ?? 0);

    return NextResponse.json({
      data: {
        net_worth: income - expenses,
        total_income: income,
        total_expenses: expenses,
        total_transactions: totalTransactions,
        custom_categories: totalCategories,
      },
    });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch user stats");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
