import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Calculate date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Use aggregate to let PostgreSQL do the summation instead of fetching all rows
    const [currentMonthIncome, currentMonthExpenses, lastMonthIncome, lastMonthExpenses] = await Promise.all([
      db.incomeTransaction.aggregate({
        where: {
          userId,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
      }),
      db.expenseTransaction.aggregate({
        where: {
          userId,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
          isInstallment: false,
        },
        _sum: { amount: true },
      }),
      db.incomeTransaction.aggregate({
        where: {
          userId,
          date: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      }),
      db.expenseTransaction.aggregate({
        where: {
          userId,
          date: { gte: lastMonthStart, lte: lastMonthEnd },
          isInstallment: false,
        },
        _sum: { amount: true },
      }),
    ]);

    const currentIncome = parseFloat((currentMonthIncome._sum.amount ?? 0).toString());
    const currentExpenses = parseFloat((currentMonthExpenses._sum.amount ?? 0).toString());
    const lastIncome = parseFloat((lastMonthIncome._sum.amount ?? 0).toString());
    const lastExpenses = parseFloat((lastMonthExpenses._sum.amount ?? 0).toString());

    // Calculate savings
    const currentSavings = currentIncome - currentExpenses;
    const lastSavings = lastIncome - lastExpenses;

    return NextResponse.json({
      currentMonth: {
        income: Math.round(currentIncome * 100) / 100,
        expenses: Math.round(currentExpenses * 100) / 100,
        savings: Math.round(currentSavings * 100) / 100,
      },
      lastMonth: {
        income: Math.round(lastIncome * 100) / 100,
        expenses: Math.round(lastExpenses * 100) / 100,
        savings: Math.round(lastSavings * 100) / 100,
      }
    });

  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly summary" },
      { status: 500 }
    );
  }
}