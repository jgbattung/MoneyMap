import { db } from "@/lib/prisma";

export interface MonthlyAggregate {
  year: number;
  month: number;
  total: number;
}

/**
 * Computes trailing-12-months cumulative net worth from monthly aggregates.
 *
 * @param totalInitialBalance - Sum of initialBalance across all net-worth accounts
 * @param incomeRows - Monthly income aggregates (all time, for accounts in scope)
 * @param expenseRows - Monthly expense aggregates (all time, for accounts in scope)
 * @param windowMonths - Array of { year, month } for the 12-month window (oldest first)
 * @returns Array of { month: string, netWorth: number } in the same order
 */
export function computeCumulativeNetWorth(
  totalInitialBalance: number,
  incomeRows: MonthlyAggregate[],
  expenseRows: MonthlyAggregate[],
  windowMonths: { year: number; month: number }[]
): { month: string; netWorth: number }[] {
  const result: { month: string; netWorth: number }[] = [];

  for (const { year, month } of windowMonths) {
    // Sum all rows up to and including this month
    let totalIncome = 0;
    for (const row of incomeRows) {
      if (row.year < year || (row.year === year && row.month <= month)) {
        totalIncome += row.total;
      }
    }

    let totalExpenses = 0;
    for (const row of expenseRows) {
      if (row.year < year || (row.year === year && row.month <= month)) {
        totalExpenses += row.total;
      }
    }

    const netWorth = totalInitialBalance + totalIncome - totalExpenses;

    const date = new Date(year, month - 1, 1);
    const monthLabel = date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    result.push({
      month: monthLabel,
      netWorth: Math.round(netWorth * 100) / 100,
    });
  }

  return result;
}

/**
 * Loads the inputs for {@link computeCumulativeNetWorth}: the summed opening balance of the
 * user's net-worth accounts plus all-time monthly income and expense aggregates for those
 * accounts (installment parents excluded). Returns null when the user has no net-worth accounts.
 */
export async function getMonthlyFlowAggregates(userId: string): Promise<{
  totalInitialBalance: number;
  incomeRows: MonthlyAggregate[];
  expenseRows: MonthlyAggregate[];
} | null> {
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
    return null;
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

  return { totalInitialBalance, incomeRows, expenseRows };
}
