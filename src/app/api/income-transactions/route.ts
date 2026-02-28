import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { onIncomeTransactionChange } from "@/lib/statement-recalculator";

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const skip = searchParams.get('skip');
    const take = searchParams.get('take');
    const search = searchParams.get('search');
    const dateFilter = searchParams.get('dateFilter');
    const accountId = searchParams.get('accountId');

    const skipNumber = skip ? parseInt(skip) : undefined;
    const takeNumber = take ? parseInt(take) : undefined;

    const whereClause: Prisma.IncomeTransactionWhereInput = {
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
          description: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        {
          account: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
        {
          incomeType: {
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

    if (accountId) {
      whereClause.accountId = accountId;
    }

    const total = await db.incomeTransaction.count({
      where: whereClause,
    });

    // Determine limit - if searching, return more results (up to 100)
    let effectiveTake = takeNumber;
    if (search && search.trim().length > 0) {
      effectiveTake = 100;
    }

    const incomeTransactions = await db.incomeTransaction.findMany({
      where: whereClause,
      include: {
        account: true,
        incomeType: true,
      },
      orderBy: {
        date: 'desc',
      },
      ...(skipNumber !== undefined && { skip: skipNumber }),
      ...(effectiveTake !== undefined && { take: effectiveTake }),
    });

    // Calculate hasMore
    const currentCount = (skipNumber || 0) + incomeTransactions.length;
    const hasMore = currentCount < total;

    return NextResponse.json({
      transactions: incomeTransactions,
      total,
      hasMore,
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting income transactions: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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

    const { name, amount, accountId, incomeTypeId, date, description } = body;

    if (!name || !amount || !accountId || !incomeTypeId || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, amount, accountId, incomeTypeId, date' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const incomeTransaction = await tx.incomeTransaction.create({
        data: {
          userId: session.user.id,
          name,
          amount: parseFloat(amount),
          accountId,
          incomeTypeId,
          date: new Date(date),
          description: description || null,
        },
        include: {
          account: true,
          incomeType: true,
        }
      });

      await tx.financialAccount.update({
        where: {
          id: accountId,
          userId: session.user.id,
        },
        data: {
          currentBalance: {
            increment: parseFloat(amount),
          },
        },
      });

      return incomeTransaction;
    });

    await onIncomeTransactionChange(accountId, new Date(date));

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating income transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}