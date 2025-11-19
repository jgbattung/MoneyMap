import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
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

    const transferTransactions = await db.transferTransaction.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        fromAccount: true,
        toAccount: true,
        transferType: true,
      },
      orderBy: {
        date: 'desc'
      },
    });

    return NextResponse.json(transferTransactions, { status: 200 });
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