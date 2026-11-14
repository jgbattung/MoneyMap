import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { computeCumulativeNetWorth, getMonthlyFlowAggregates } from "@/lib/net-worth-history";

export const dynamic = 'force-dynamic';

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

    const flows = await getMonthlyFlowAggregates(userId);

    if (!flows) {
      return NextResponse.json({ history: [] });
    }

    const { totalInitialBalance, incomeRows, expenseRows } = flows;

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

    // Start one month before windowStart: that leading month has zero flows,
    // so it computes to the true opening balance (fixes the month-end
    // off-by-one where history[jan] is Jan 31 and already includes January's
    // activity).
    const windowMonths: { year: number; month: number }[] = [];
    const cursor = new Date(windowStart.getFullYear(), windowStart.getMonth() - 1, 1);
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
