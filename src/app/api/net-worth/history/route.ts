import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { computeCumulativeNetWorth } from "@/lib/net-worth-history";

export const dynamic = 'force-dynamic';

interface MonthlyAggregate {
  year: number;
  month: number;
  total: number;
}

export async function GET(_req: NextRequest) {
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

    // Aggregate monthly income and expenses via SQL GROUP BY (no unbounded row scan in JS)
    const [incomeRows, expenseRows] = await Promise.all([
      db.$queryRaw<MonthlyAggregate[]>`
        SELECT
          EXTRACT(YEAR FROM date)::int  AS year,
          EXTRACT(MONTH FROM date)::int AS month,
          SUM(amount)::float            AS total
        FROM income_transactions
        WHERE user_id = ${userId}
          AND account_id = ANY(${accountIds}::text[])
        GROUP BY year, month
        ORDER BY year ASC, month ASC
      `,
      db.$queryRaw<MonthlyAggregate[]>`
        SELECT
          EXTRACT(YEAR FROM date)::int  AS year,
          EXTRACT(MONTH FROM date)::int AS month,
          SUM(amount)::float            AS total
        FROM expense_transactions
        WHERE user_id = ${userId}
          AND account_id = ANY(${accountIds}::text[])
          AND is_installment = false
        GROUP BY year, month
        ORDER BY year ASC, month ASC
      `,
    ]);

    // Build the full-history window (oldest data month -> current month, oldest first).
    // The client slices this to the user-selected range (3M / 6M / 1Y / All).
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let windowStart: Date;
    const allRows = [...incomeRows, ...expenseRows];
    if (allRows.length > 0) {
      const earliest = allRows.reduce((min, row) =>
        row.year < min.year || (row.year === min.year && row.month < min.month) ? row : min
      );
      windowStart = new Date(earliest.year, earliest.month - 1, 1);
    } else {
      // No transaction history: keep a trailing 12-month window so the chart isn't a single point.
      windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    const windowMonths: { year: number; month: number }[] = [];
    const cursor = new Date(windowStart);
    while (cursor <= currentMonthStart) {
      windowMonths.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const history = computeCumulativeNetWorth(
      totalInitialBalance,
      incomeRows,
      expenseRows,
      windowMonths
    );

    return NextResponse.json({ history });

  } catch (error) {
    console.error("Error fetching net worth history:", error);
    return NextResponse.json(
      { error: "Failed to fetch net worth history" },
      { status: 500 }
    );
  }
}
