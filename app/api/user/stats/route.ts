import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

function getMonthRange(monthsAgo: number): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const to = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { from, to };
}

function calcTrend(
  current: number,
  previous: number,
): { direction: "up" | "down" | "flat"; percentage: number } {
  if (previous === 0) {
    return {
      direction: current > 0 ? "up" : current < 0 ? "down" : "flat",
      percentage: current === 0 ? 0 : 100,
    };
  }
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    percentage: Math.round(Math.abs(change)),
  };
}

export const GET = withAuth(async (_req, { user }) => {
  try {
    const currentMonth = getMonthRange(0);
    const previousMonth = getMonthRange(1);

    const [
      totalIncome,
      totalExpenses,
      totalTransactions,
      totalCategories,
      currentIncome,
      currentExpenses,
      previousIncome,
      previousExpenses,
    ] = await Promise.all([
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
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "INCOME",
          recorded_at: { gte: currentMonth.from, lt: currentMonth.to },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: currentMonth.from, lt: currentMonth.to },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "INCOME",
          recorded_at: { gte: previousMonth.from, lt: previousMonth.to },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: previousMonth.from, lt: previousMonth.to },
        },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(totalIncome._sum.amount ?? 0);
    const expenses = Number(totalExpenses._sum.amount ?? 0);

    const currentNet =
      Number(currentIncome._sum.amount ?? 0) -
      Number(currentExpenses._sum.amount ?? 0);
    const previousNet =
      Number(previousIncome._sum.amount ?? 0) -
      Number(previousExpenses._sum.amount ?? 0);

    const trend = calcTrend(currentNet, previousNet);

    return NextResponse.json({
      data: {
        net_worth: income - expenses,
        total_income: income,
        total_expenses: expenses,
        total_transactions: totalTransactions,
        custom_categories: totalCategories,
        trend,
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
