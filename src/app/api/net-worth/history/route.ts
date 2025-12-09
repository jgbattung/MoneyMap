import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

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

    const accounts = await prisma.financialAccount.findMany({
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

    const [incomeTransactions, expenseTransactions, transferTransactions] = await Promise.all([
      prisma.incomeTransaction.findMany({
        where: {
          userId,
          accountId: { in: accountIds }
        },
        select: {
          accountId: true,
          amount: true,
          date: true,
        }
      }),
      prisma.expenseTransaction.findMany({
        where: {
          userId,
          accountId: { in: accountIds }
        },
        select: {
          accountId: true,
          amount: true,
          date: true,
        }
      }),
      prisma.transferTransaction.findMany({
        where: {
          userId,
          OR: [
            { fromAccountId: { in: accountIds } },
            { toAccountId: { in: accountIds } }
          ]
        },
        select: {
          fromAccountId: true,
          toAccountId: true,
          amount: true,
          date: true,
        }
      })
    ]);

    const months: { month: string; netWorth: number }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      // First day of the target month
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Last moment of the target month
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      let totalNetWorth = 0;

      // Calculate net worth for each account at end of this month
      for (const account of accounts) {
        let balance = parseFloat(account.initialBalance.toString());

        // Add income up to end of month
        const incomeUpToDate = incomeTransactions
          .filter(t => t.accountId === account.id && new Date(t.date) <= endOfMonth)
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        // Subtract expenses up to end of month
        const expensesUpToDate = expenseTransactions
          .filter(t => t.accountId === account.id && new Date(t.date) <= endOfMonth)
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        // Handle transfers (subtract from source, add to destination)
        const transfersOut = transferTransactions
          .filter(t => t.fromAccountId === account.id && new Date(t.date) <= endOfMonth)
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const transfersIn = transferTransactions
          .filter(t => t.toAccountId === account.id && new Date(t.date) <= endOfMonth)
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        // Calculate final balance for this account
        balance = balance + incomeUpToDate - expensesUpToDate - transfersOut + transfersIn;
        totalNetWorth += balance;
      }

      const monthLabel = targetDate.toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      });

      months.push({
        month: monthLabel,
        netWorth: Math.round(totalNetWorth * 100) / 100 // Round to 2 decimal places
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