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

export async function calculateAccountBalanceAtDate(
  accountId: string,
  date: Date
): Promise<number> {
  const [account, incomeSum, expenseSum, transfersInSum, transfersOutData] = await Promise.all([
    db.financialAccount.findUnique({
      where: { id: accountId },
      select: { initialBalance: true },
    }),
    db.incomeTransaction.aggregate({
      where: {
        accountId,
        date: { lte: date },
      },
      _sum: { amount: true },
    }),
    db.expenseTransaction.aggregate({
      where: {
        accountId,
        date: { lte: date },
      },
      _sum: { amount: true },
    }),
    db.transferTransaction.aggregate({
      where: {
        toAccountId: accountId,
        date: { lte: date },
      },
      _sum: { amount: true },
    }),
    db.transferTransaction.findMany({
      where: {
        fromAccountId: accountId,
        date: { lte: date },
      },
      select: {
        amount: true,
        feeAmount: true,
      },
    }),
  ]);

  if (!account) {
    throw new Error(`Account with id ${accountId} not found`);
  }

  // Calculate balance
  let balance = parseFloat(account.initialBalance.toString());

  // Add income
  if (incomeSum._sum.amount) {
    balance += parseFloat(incomeSum._sum.amount.toString());
  }

  // Subtract expenses
  if (expenseSum._sum.amount) {
    balance -= parseFloat(expenseSum._sum.amount.toString());
  }

  // Add transfers in
  if (transfersInSum._sum.amount) {
    balance += transfersInSum._sum.amount;
  }

  // Subtract transfers out and fees
  for (const transfer of transfersOutData) {
    balance -= transfer.amount;
    if (transfer.feeAmount) {
      balance -= parseFloat(transfer.feeAmount.toString());
    }
  }

  return balance;
}

export async function calculateNetWorthAtDate(
  userId: string,
  date: Date
): Promise<number> {
  const accounts = await db.financialAccount.findMany({
    where: {
      userId,
      addToNetWorth: true,
    },
    select: { id: true },
  });

  // Calculate balances in parallel
  const balances = await Promise.all(
    accounts.map(account => calculateAccountBalanceAtDate(account.id, date))
  );

  const totalNetWorth = balances.reduce((sum, balance) => sum + balance, 0);

  return totalNetWorth;
}

export async function calculateMonthlyChange(userId: string): Promise<{
  change: number;
  percentage: number;
}> {
  const today = new Date();

  // Get end of previous month
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  endOfLastMonth.setHours(23, 59, 59, 999);

  // Calculate both net worths in parallel
  const [previousNetWorth, currentNetWorth] = await Promise.all([
    calculateNetWorthAtDate(userId, endOfLastMonth),
    calculateCurrentNetWorth(userId),
  ]);

  const change = currentNetWorth - previousNetWorth;

  const percentage =
    previousNetWorth !== 0 ? (change / Math.abs(previousNetWorth)) * 100 : 0;

  return {
    change: parseFloat(change.toFixed(2)),
    percentage: parseFloat(percentage.toFixed(2)),
  };
}