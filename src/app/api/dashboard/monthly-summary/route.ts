import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

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

    // Current month
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthLastDay = new Date(currentYear, now.getMonth() + 1, 0).getDate();
    const currentMonthStart = `${currentYear}-${currentMonth}-01`;
    const currentMonthEnd = `${currentYear}-${currentMonth}-${String(currentMonthLastDay).padStart(2, '0')}`;

    // Last month
    const lastMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
    const lastYear = lastMonthDate.getFullYear();
    const lastMonth = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    const lastMonthLastDay = new Date(lastYear, lastMonthDate.getMonth() + 1, 0).getDate();
    const lastMonthStart = `${lastYear}-${lastMonth}-01`;
    const lastMonthEnd = `${lastYear}-${lastMonth}-${String(lastMonthLastDay).padStart(2, '0')}`;

    // Fetch current month transactions
    const [currentMonthIncome, currentMonthExpenses] = await Promise.all([
      db.incomeTransaction.findMany({
        where: {
          userId,
          date: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          }
        },
        select: { amount: true }
      }),
      db.expenseTransaction.findMany({
        where: {
          userId,
          date: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
          isInstallment: false, // Only count actual expenses, not installment parents
        },
        select: { amount: true }
      })
    ]);

    // Fetch last month transactions
    const [lastMonthIncome, lastMonthExpenses] = await Promise.all([
      db.incomeTransaction.findMany({
        where: {
          userId,
          date: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          }
        },
        select: { amount: true }
      }),
      db.expenseTransaction.findMany({
        where: {
          userId,
          date: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
          isInstallment: false,
        },
        select: { amount: true }
      })
    ]);

    // Calculate totals
    const currentIncome = currentMonthIncome.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()), 
      0
    );
    const currentExpenses = currentMonthExpenses.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()), 
      0
    );
    const lastIncome = lastMonthIncome.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()), 
      0
    );
    const lastExpenses = lastMonthExpenses.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()), 
      0
    );

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