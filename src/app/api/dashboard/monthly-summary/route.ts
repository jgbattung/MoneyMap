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
    const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const currentMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));

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