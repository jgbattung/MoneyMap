import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

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

    // Get pagination params from URL
    const { searchParams } = new URL(request.url);
    const skip = searchParams.get('skip');
    const take = searchParams.get('take');

    const skipNumber = skip ? parseInt(skip) : undefined;
    const takeNumber = take ? parseInt(take) : undefined;

    // Build the where clause
    const whereClause = {
      userId: session.user.id,
    };

    // Get total count
    const total = await db.incomeTransaction.count({
      where: whereClause,
    });

    // Get transactions with optional pagination
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
      ...(takeNumber !== undefined && { take: takeNumber }),
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

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating income transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}