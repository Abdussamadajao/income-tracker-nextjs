import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma, Decimal } from "@/server/prisma";
import { authLogger } from "@/server/log";

type DecimalType = InstanceType<typeof Decimal>;

function toNum(value: DecimalType | string | number): number {
  if (value instanceof Decimal) return value.toNumber();
  return Number(value);
}

function getDateRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);

  switch (period) {
    case "week":
      from.setDate(now.getDate() - 7);
      break;
    case "3m":
      from.setMonth(now.getMonth() - 3);
      break;
    case "year":
      from.setFullYear(now.getFullYear() - 1);
      break;
    case "month":
    default:
      from.setMonth(now.getMonth() - 1);
      break;
  }

  return { from, to };
}

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const period = req.nextUrl.searchParams.get("period") ?? "month";
  const { from, to } = getDateRange(period);

  try {
    const [
      allIncome,
      allExpenses,
      periodIncome,
      periodExpenses,
      recentTransactions,
      chartData,
      budgets,
      spendingByCategory,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { user_id: user.id, type: "INCOME" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { user_id: user.id, type: "EXPENSE" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "INCOME",
          recorded_at: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { user_id: user.id },
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
        orderBy: { recorded_at: "desc" },
        take: 3,
      }),
      prisma.transaction.groupBy({
        by: ["recorded_at", "type"],
        where: {
          user_id: user.id,
          recorded_at: { gte: from, lte: to },
        },
        _sum: { amount: true },
        orderBy: { recorded_at: "asc" },
      }),
      // Fetch active budgets
      prisma.budget.findMany({
        where: {
          user_id: user.id,
          is_archived: false,
        },
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
        orderBy: { created_at: "desc" },
      }),
      // Get spending by category for the period
      prisma.transaction.groupBy({
        by: ["category_id"],
        where: {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: from, lte: to },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = toNum(allIncome._sum.amount ?? 0);
    const totalExpenses = toNum(allExpenses._sum.amount ?? 0);
    const netWorth = totalIncome - totalExpenses;

    const periodIncomeTotal = toNum(periodIncome._sum.amount ?? 0);
    const periodExpenseTotal = toNum(periodExpenses._sum.amount ?? 0);
    const periodSavings = periodIncomeTotal - periodExpenseTotal;
    const savingsRate =
      periodIncomeTotal > 0
        ? Math.round((periodSavings / periodIncomeTotal) * 100)
        : 0;

    const recent = recentTransactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: toNum(tx.amount),
      source_name: tx.source_name,
      recorded_at: tx.recorded_at,
      category: tx.category,
      isIncome: tx.type === "INCOME",
    }));

    const chartMap = new Map<string, { income: number; expense: number }>();

    for (const row of chartData) {
      const day = row.recorded_at.toISOString().slice(0, 10);
      if (!chartMap.has(day)) {
        chartMap.set(day, { income: 0, expense: 0 });
      }
      const entry = chartMap.get(day)!;
      if (row.type === "INCOME") {
        entry.income += toNum(row._sum.amount ?? 0);
      } else {
        entry.expense += toNum(row._sum.amount ?? 0);
      }
    }

    const chart = Array.from(chartMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));

    // Process budget data
    const spendingMap = new Map(
      spendingByCategory.map((s) => [s.category_id, toNum(s._sum.amount ?? 0)]),
    );

    const budgetData = budgets.map((budget) => {
      const spent = budget.category_id
        ? (spendingMap.get(budget.category_id) ?? 0)
        : 0;
      const budgetAmount = toNum(budget.amount);
      const remaining = budgetAmount - spent;
      const percentage =
        budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

      return {
        id: budget.id,
        category: budget.category,
        amount: budgetAmount,
        spent,
        remaining,
        percentage,
        period: budget.period,
        start_date: budget.start_date,
        is_over_budget: spent > budgetAmount,
      };
    });

    // Calculate total budget overview
    const totalBudget = budgetData.reduce((sum, b) => sum + b.amount, 0);
    const totalBudgetSpent = budgetData.reduce((sum, b) => sum + b.spent, 0);
    const totalBudgetRemaining = totalBudget - totalBudgetSpent;
    const overallBudgetPercentage =
      totalBudget > 0 ? Math.round((totalBudgetSpent / totalBudget) * 100) : 0;

    return NextResponse.json({
      data: {
        net_worth: {
          total: netWorth,
          total_income: totalIncome,
          total_expenses: totalExpenses,
        },
        period: {
          label: period,
          from: from.toISOString(),
          to: to.toISOString(),
          income: periodIncomeTotal,
          expenses: periodExpenseTotal,
          savings: periodSavings,
          savings_rate: savingsRate,
        },
        recent,
        chart,
        budgets: {
          items: budgetData,
          summary: {
            total_budget: totalBudget,
            total_spent: totalBudgetSpent,
            total_remaining: totalBudgetRemaining,
            overall_percentage: overallBudgetPercentage,
            is_overall_over_budget: totalBudgetSpent > totalBudget,
          },
        },
      },
    });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch dashboard");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
