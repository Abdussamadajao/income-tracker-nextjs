import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma, Decimal } from "@/server/prisma";
import { authLogger } from "@/server/log";

type DecimalType = InstanceType<typeof Decimal>;

function toNum(value: DecimalType | string | number): number {
  if (value instanceof Decimal) return value.toNumber();
  return Number(value);
}

function getPeriodDates(period: string) {
  const now = new Date();

  const currTo = new Date(now);
  const currFrom = new Date(now);

  const prevTo = new Date(now);
  const prevFrom = new Date(now);

  switch (period) {
    case "week":
      currFrom.setDate(now.getDate() - 7);
      prevTo.setDate(now.getDate() - 7);
      prevFrom.setDate(now.getDate() - 14);
      break;
    case "year":
      currFrom.setFullYear(now.getFullYear() - 1);
      prevTo.setFullYear(now.getFullYear() - 1);
      prevFrom.setFullYear(now.getFullYear() - 2);
      break;
    case "month":
    default:
      currFrom.setMonth(now.getMonth() - 1);
      prevTo.setMonth(now.getMonth() - 1);
      prevFrom.setMonth(now.getMonth() - 2);
      break;
  }

  return { currFrom, currTo, prevFrom, prevTo };
}

function generateObservations({
  savingsRate,
  topCategory,
  expenseChange,
  incomeChange,
}: {
  savingsRate: number;
  topCategory: string;
  expenseChange: number;
  incomeChange: number;
}): string[] {
  const observations: string[] = [];

  if (savingsRate >= 30) {
    observations.push(
      `Great job! You saved ${savingsRate}% of your income this period.`,
    );
  } else if (savingsRate >= 10) {
    observations.push(
      `You saved ${savingsRate}% of your income. Try to push towards 30%.`,
    );
  } else if (savingsRate > 0) {
    observations.push(
      `Your savings rate is ${savingsRate}%. Consider reducing spending.`,
    );
  } else {
    observations.push(
      `You spent more than you earned this period. Review your expenses.`,
    );
  }

  if (topCategory) {
    observations.push(`Your biggest spending category was ${topCategory}.`);
  }

  if (expenseChange > 20) {
    observations.push(
      `Expenses increased by ${expenseChange.toFixed(0)}% compared to last period.`,
    );
  } else if (expenseChange < -20) {
    observations.push(
      `Expenses dropped by ${Math.abs(expenseChange).toFixed(0)}% — great progress!`,
    );
  }

  if (incomeChange > 10) {
    observations.push(
      `Income grew by ${incomeChange.toFixed(0)}% compared to last period.`,
    );
  } else if (incomeChange < -10) {
    observations.push(
      `Income dropped by ${Math.abs(incomeChange).toFixed(0)}% from last period.`,
    );
  }

  return observations;
}

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const period = req.nextUrl.searchParams.get("period") ?? "month";
  const { currFrom, currTo, prevFrom, prevTo } = getPeriodDates(period);

  try {
    const [
      spendingByCategory,
      incomeByCategory,
      currentIncome,
      currentExpenses,
      prevIncome,
      prevExpenses,
      topIncomeSources,
      budgets,
    ] = await Promise.all([
      prisma.transaction.groupBy({
        by: ["category_id"],
        where: {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: currFrom, lte: currTo },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.transaction.groupBy({
        by: ["category_id"],
        where: {
          user_id: user.id,
          type: "INCOME",
          recorded_at: { gte: currFrom, lte: currTo },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "INCOME",
          recorded_at: { gte: currFrom, lte: currTo },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: currFrom, lte: currTo },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "INCOME",
          recorded_at: { gte: prevFrom, lte: prevTo },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          user_id: user.id,
          type: "EXPENSE",
          recorded_at: { gte: prevFrom, lte: prevTo },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          user_id: user.id,
          type: "INCOME",
          recorded_at: { gte: currFrom, lte: currTo },
        },
        select: {
          id: true,
          amount: true,
          source_name: true,
          recorded_at: true,
          expenses: { select: { amount: true } },
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
        orderBy: { amount: "desc" },
        take: 5,
      }),
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
    ]);

    const categoryIds = [
      ...spendingByCategory.map((r) => r.category_id),
      ...incomeByCategory.map((r) => r.category_id),
    ];

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

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

    const currIncomeTotal = toNum(currentIncome._sum.amount ?? 0);
    const currExpenseTotal = toNum(currentExpenses._sum.amount ?? 0);
    const currSavings = currIncomeTotal - currExpenseTotal;
    const savingsRate =
      currIncomeTotal > 0
        ? Math.round((currSavings / currIncomeTotal) * 100)
        : 0;

    const prevIncomeTotal = toNum(prevIncome._sum.amount ?? 0);
    const prevExpenseTotal = toNum(prevExpenses._sum.amount ?? 0);
    const prevSavings = prevIncomeTotal - prevExpenseTotal;

    const incomeChange =
      prevIncomeTotal > 0
        ? ((currIncomeTotal - prevIncomeTotal) / prevIncomeTotal) * 100
        : 0;
    const expenseChange =
      prevExpenseTotal > 0
        ? ((currExpenseTotal - prevExpenseTotal) / prevExpenseTotal) * 100
        : 0;
    const savingsChange =
      prevSavings !== 0
        ? ((currSavings - prevSavings) / Math.abs(prevSavings)) * 100
        : 0;

    const spendingSlices = spendingByCategory.map((row) => {
      const cat = categoryMap.get(row.category_id);
      const amount = toNum(row._sum.amount ?? 0);
      return {
        category_id: row.category_id,
        name: cat?.name ?? "Unknown",
        icon: cat?.icon ?? "more-horiz",
        color: cat?.color ?? "#6b7280",
        amount,
        count: row._count.id,
        percentage:
          currExpenseTotal > 0
            ? Math.round((amount / currExpenseTotal) * 100)
            : 0,
      };
    });

    const incomeSlices = incomeByCategory.map((row) => {
      const cat = categoryMap.get(row.category_id);
      const amount = toNum(row._sum.amount ?? 0);
      return {
        category_id: row.category_id,
        name: cat?.name ?? "Unknown",
        icon: cat?.icon ?? "more-horiz",
        color: cat?.color ?? "#6b7280",
        amount,
        count: row._count.id,
        percentage:
          currIncomeTotal > 0
            ? Math.round((amount / currIncomeTotal) * 100)
            : 0,
      };
    });

    const incomeSources = topIncomeSources.map((tx) => {
      const spent = tx.expenses.reduce((s, e) => s + toNum(e.amount), 0);
      const total = toNum(tx.amount);
      const remaining = total - spent;
      return {
        id: tx.id,
        source_name: tx.source_name,
        category: tx.category,
        amount: total,
        spent,
        remaining,
        percentage: total > 0 ? Math.round((spent / total) * 100) : 0,
        recorded_at: tx.recorded_at,
      };
    });

    const topCategory = spendingSlices[0]?.name ?? "";
    const observations = generateObservations({
      savingsRate,
      topCategory,
      expenseChange,
      incomeChange,
    });

    return NextResponse.json({
      data: {
        period: {
          label: period,
          from: currFrom.toISOString(),
          to: currTo.toISOString(),
        },
        summary: {
          income: currIncomeTotal,
          expenses: currExpenseTotal,
          savings: currSavings,
          savings_rate: savingsRate,
        },
        comparison: {
          income_change: incomeChange,
          expense_change: expenseChange,
          savings_change: savingsChange,
          prev_income: prevIncomeTotal,
          prev_expenses: prevExpenseTotal,
          prev_savings: prevSavings,
        },
        spending_by_category: spendingSlices,
        income_by_category: incomeSlices,
        income_sources: incomeSources,
        budgets: budgetData,
        observations,
      },
    });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch insights");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
