import { db } from "./prisma";

export async function calculateAccountBalanceAtDate(
  accountId: string,
  date: Date
): Promise<number> {
  const account = await db.financialAccount.findUnique({
    where: { id: accountId },
    select: { initialBalance: true },
  });

  if (!account) {
    throw new Error('Account not found');
  }

  // Get all income transactions up to the date
  const incomeTransactions = await db.incomeTransaction.findMany({
    where: {
      accountId,
      date: { lte: date },
    },
    select: { amount: true },
  });

  // Get all expense transactions up to the date
  const expenseTransactions = await db.expenseTransaction.findMany({
    where: {
      accountId,
      date: { lte: date },
    },
    select: { amount: true },
  });

  // Get all transfers TO this account up to the date
  const transfersIn = await db.transferTransaction.findMany({
    where: {
      toAccountId: accountId,
      date: { lte: date },
    },
    select: { amount: true },
  });

  // Get all transfers FROM this account up to the date
  const transfersOut = await db.transferTransaction.findMany({
    where: {
      fromAccountId: accountId,
      date: { lte: date },
    },
    select: { amount: true, feeAmount: true },
  });

  // Calculate balance
  let balance = parseFloat(account.initialBalance.toString());

  // Add income
  for (const income of incomeTransactions) {
    balance += parseFloat(income.amount.toString());
  }

  // Subtract expenses
  for (const expense of expenseTransactions) {
    balance -= parseFloat(expense.amount.toString());
  }

  // Add transfers in
  for (const transfer of transfersIn) {
    balance += transfer.amount;
  }

  // Subtract transfers out and fees
  for (const transfer of transfersOut) {
    balance -= transfer.amount;
    if (transfer.feeAmount) {
      balance -= parseFloat(transfer.feeAmount.toString());
    }
  }

  return balance;
}

export async function calculateNetWorth(
  userId: string,
  date?: Date
): Promise<number> {
  const targetDate = date || new Date();

  const accounts = await db.financialAccount.findMany({
    where: {
      userId,
      addToNetWorth: true,
    },
    select: {
      id: true,
    },
  });

  let totalNetWorth = 0;

  for (const account of accounts) {
    const balance= await calculateAccountBalanceAtDate(account.id, targetDate);
    totalNetWorth += balance;
  }

  return totalNetWorth;
}

export async function calculateMonthlyChange(userId: string): Promise<{
  change: number,
  percentage: number
}> {
  const today = new Date();

  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  endOfLastMonth.setHours(23, 59, 59, 999);
  
  const previousNetWorth = await calculateNetWorth(userId, endOfLastMonth);

  const currentNetWorth = await calculateNetWorth(userId);

  const change = currentNetWorth - previousNetWorth;

  const percentage =
  previousNetWorth !== 0 ? (change / Math.abs(previousNetWorth)) * 100 : 0;

  return {
    change: parseFloat(change.toFixed(2)),
    percentage: parseFloat(percentage.toFixed(2)),
  };
}