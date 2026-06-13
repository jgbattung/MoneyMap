interface MonthlyAggregate {
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
