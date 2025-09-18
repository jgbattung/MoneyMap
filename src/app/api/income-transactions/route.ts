import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
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

    const incomeTransactions = await db.incomeTransaction.findMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(incomeTransactions, { status: 200 });
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

    if (error instanceof Error && 'code' in error && error.code === "P20002") {
      return NextResponse.json(
        { error: 'An income transaction with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}