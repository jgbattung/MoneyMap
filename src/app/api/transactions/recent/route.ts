import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

interface RecentTransaction {
  id: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  name: string;
  amount: number;
  date: string;
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  toAccountId?: string;
  toAccountName?: string;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const expenses = await db.expenseTransaction.findMany({
      where: { 
        userId,
        isInstallment: false,
      },
      include: {
        account: true,
        expenseType: true,
      },
      orderBy: { date: 'desc' },
      take: 6,
    });

    const incomes = await db.incomeTransaction.findMany({
      where: { userId },
      include: {
        account: true,
        incomeType: true,
      },
      orderBy: { date: 'desc' },
      take: 6,
    });

    const transfers = await db.transferTransaction.findMany({
      where: { userId },
      include: {
        fromAccount: true,
        toAccount: true,
        transferType: true,
      },
      orderBy: { date: 'desc' },
      take: 6,
    });

    const expenseTransactions: RecentTransaction[] = expenses.map((exp) => ({
      id: exp.id,
      type: 'EXPENSE' as const,
      name: exp.name,
      amount: exp.amount.toNumber(),
      date: exp.date.toISOString(),
      accountId: exp.accountId,
      accountName: exp.account.name,
      categoryId: exp.expenseTypeId,
      categoryName: exp.expenseType.name,
    }));

    const incomeTransactions: RecentTransaction[] = incomes.map((inc) => ({
      id: inc.id,
      type: 'INCOME' as const,
      name: inc.name,
      amount: inc.amount.toNumber(),
      date: inc.date.toISOString(),
      accountId: inc.accountId,
      accountName: inc.account.name,
      categoryId: inc.incomeTypeId,
      categoryName: inc.incomeType.name,
    }));

    const transferTransactions: RecentTransaction[] = transfers.map((transfer) => ({
      id: transfer.id,
      type: 'TRANSFER' as const,
      name: transfer.name,
      amount: transfer.amount,
      date: transfer.date.toISOString(),
      accountId: transfer.fromAccountId,
      accountName: transfer.fromAccount.name,
      categoryId: transfer.transferTypeId,
      categoryName: transfer.transferType.name,
      toAccountId: transfer.toAccountId,
      toAccountName: transfer.toAccount.name,
    }));

    const allTransactions = [
      ...expenseTransactions,
      ...incomeTransactions,
      ...transferTransactions,
    ];

    const recentTransactions = allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);

    return NextResponse.json(
      { transactions: recentTransactions },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}