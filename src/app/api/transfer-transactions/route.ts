import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get params from URL
    const { searchParams } = new URL(request.url);
    const skip = searchParams.get('skip');
    const take = searchParams.get('take');
    const search = searchParams.get('search');
    const dateFilter = searchParams.get('dateFilter');

    const skipNumber = skip ? parseInt(skip) : undefined;
    const takeNumber = take ? parseInt(take) : undefined;

    const whereClause: Prisma.TransferTransactionWhereInput = {
      userId: session.user.id,
    };

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        {
          fromAccount: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
        {
          toAccount: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
        {
          transferType: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
      ];
    }

    if (dateFilter && dateFilter !== 'view-all') {
      const now = new Date();
      
      if (dateFilter === 'this-month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        whereClause.date = {
          gte: startOfMonth,
          lte: endOfMonth,
        };
      } else if (dateFilter === 'this-year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        
        whereClause.date = {
          gte: startOfYear,
          lte: endOfYear,
        };
      }
    }

    const total = await db.transferTransaction.count({
      where: whereClause,
    });

    let effectiveTake = takeNumber;
    if (search && search.trim().length > 0) {
      effectiveTake = 100;
    }

    // Get transactions with optional pagination
    const transferTransactions = await db.transferTransaction.findMany({
      where: whereClause,
      include: {
        fromAccount: true,
        toAccount: true,
        transferType: true,
      },
      orderBy: {
        date: 'desc'
      },
      ...(skipNumber !== undefined && { skip: skipNumber }),
      ...(effectiveTake !== undefined && { take: effectiveTake }),
    });

    // Calculate hasMore
    const currentCount = (skipNumber || 0) + transferTransactions.length;
    const hasMore = currentCount < total;

    return NextResponse.json({
      transactions: transferTransactions,
      total,
      hasMore,
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting transfer transactions: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { name, amount, fromAccountId, toAccountId, transferTypeId, date, notes, feeAmount  } = body;

    if (!name || !amount || !fromAccountId || !toAccountId || !transferTypeId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: 'From account and to account must be different' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      let feeExpenseId = null;

      if (feeAmount && parseFloat(feeAmount) > 0) {
        let transferFeeType = await tx.expenseType.findFirst({
          where: {
            userId: session.user.id,
            name: "Transfer fee",
          },
        });

        if (!transferFeeType) {
          transferFeeType = await tx.expenseType.create({
            data: {
              userId: session.user.id,
              name: "Transfer fee",
              isSystem: true,
              monthlyBudget: null,
            },
          });
        }

        const fromAccount = await tx.financialAccount.findUnique({
          where: { id: fromAccountId },
          select: { name: true },
        });

        const feeExpense = await tx.expenseTransaction.create({
          data: {
            userId: session.user.id,
            accountId: fromAccountId,
            expenseTypeId: transferFeeType.id,
            name: `Transfer fee: ${name}`,
            amount: parseFloat(feeAmount),
            date: new Date(date),
            description: `Deducted from ${fromAccount?.name}`,
          },
        });

        feeExpenseId = feeExpense.id;

        await tx.financialAccount.update({
          where: { id: fromAccountId },
          data: { currentBalance: { decrement: parseFloat(feeAmount) } }
        })

      }

      // Create the transfer transaction
      const transfer = await tx.transferTransaction.create({
        data: {
          userId: session.user.id,
          name: name,
          amount: parseFloat(amount),
          fromAccountId,
          toAccountId,
          transferTypeId,
          date: new Date(date),
          notes: notes || null,
          feeAmount: feeAmount ? parseFloat(feeAmount) : null,
          feeExpenseId: feeExpenseId,
        },
        include: {
          fromAccount: true,
          toAccount: true,
          transferType: true,
          feeExpense: true,
        }
      });

      await tx.financialAccount.update({
        where: { id: fromAccountId },
        data: { currentBalance: { decrement: parseFloat(amount) } }
      });

      await tx.financialAccount.update({
        where: { id: toAccountId },
        data: { currentBalance: { increment: parseFloat(amount) } }
      });

      return transfer;
    }, {
      timeout: 10000,
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating transfer transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}