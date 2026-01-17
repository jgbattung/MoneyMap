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

    // Get all accounts with initialBalance
    const accounts = await db.financialAccount.findMany({
      where: {
        userId,
        addToNetWorth: true,
      },
      select: {
        id: true,
        initialBalance: true,
      }
    });

    if (accounts.length === 0) {
      return NextResponse.json({ history: [] });
    }

    const accountIds = accounts.map(a => a.id);

    // Calculate total initial balance across all accounts
    const totalInitialBalance = accounts.reduce(
      (sum, account) => sum + parseFloat(account.initialBalance.toString()),
      0
    );

    // Bulk fetch ALL transactions
    const [incomeTransactions, expenseTransactions] = await Promise.all([
      db.incomeTransaction.findMany({
        where: {
          userId,
          accountId: { in: accountIds }
        },
        select: {
          amount: true,
          date: true,
        }
      }),
      db.expenseTransaction.findMany({
        where: {
          userId,
          accountId: { in: accountIds },
          isInstallment: false,
        },
        select: {
          amount: true,
          date: true,
        }
      }),
    ]);

    const months: { month: string; netWorth: number }[] = [];
    const now = new Date();

    // Calculate net worth for each of the last 12 months
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Filter and sum income up to end of this month
      const totalIncome = incomeTransactions
        .filter(t => new Date(t.date) <= endOfMonth)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      // Filter and sum expenses up to end of this month
      const totalExpenses = expenseTransactions
        .filter(t => new Date(t.date) <= endOfMonth)
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

      // Net worth = initial balance + income - expenses
      const netWorth = totalInitialBalance + totalIncome - totalExpenses;

      const monthLabel = targetDate.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });

      months.push({
        month: monthLabel,
        netWorth: Math.round(netWorth * 100) / 100
      });
    }

    return NextResponse.json({ history: months });

  } catch (error) {
    console.error("Error fetching net worth history:", error);
    return NextResponse.json(
      { error: "Failed to fetch net worth history" },
      { status: 500 }
    );
  }
}