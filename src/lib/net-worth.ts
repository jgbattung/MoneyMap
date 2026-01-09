import { db } from "@/lib/prisma";

export async function calculateCurrentNetWorth(userId: string): Promise<number> {
  const result = await db.financialAccount.aggregate({
    where: {
      userId,
      addToNetWorth: true,
    },
    _sum: {
      currentBalance: true,
    },
  });

  return result._sum.currentBalance 
    ? parseFloat(result._sum.currentBalance.toString()) 
    : 0;
}

export async function calculateMonthlyChange(userId: string): Promise<{
  change: number;
  percentage: number;
}> {
  const today = new Date();
  
  // Get start and end of current month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  // Get current net worth
  const currentNetWorth = await calculateCurrentNetWorth(userId);

  const accounts = await db.financialAccount.findMany({
    where: {
      userId,
      addToNetWorth: true,
    },
    select: { id: true },
  });

  if (accounts.length === 0) {
    return {
      change: 0,
      percentage: 0,
    };
  }

  const accountIds = accounts.map(a => a.id);

  const [incomeThisMonth, expensesThisMonth] = await Promise.all([
    db.incomeTransaction.aggregate({
      where: {
        userId,
        accountId: { in: accountIds },
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    }),
    db.expenseTransaction.aggregate({
      where: {
        userId,
        accountId: { in: accountIds },
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  // Calculate this month's net change
  const income = incomeThisMonth._sum.amount 
    ? parseFloat(incomeThisMonth._sum.amount.toString()) 
    : 0;
  
  const expenses = expensesThisMonth._sum.amount 
    ? parseFloat(expensesThisMonth._sum.amount.toString()) 
    : 0;

  // Net change this month = income - expenses
  const thisMonthChange = income - expenses;

  // Previous month's net worth = current - this month's change
  const previousNetWorth = currentNetWorth - thisMonthChange;

  // Calculate change and percentage
  const change = currentNetWorth - previousNetWorth;
  const percentage = previousNetWorth !== 0 
    ? (change / Math.abs(previousNetWorth)) * 100 
    : 0;

  return {
    change: parseFloat(change.toFixed(2)),
    percentage: parseFloat(percentage.toFixed(2)),
  };
}