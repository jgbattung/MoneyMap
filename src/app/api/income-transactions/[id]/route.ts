import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { onIncomeTransactionChange } from "@/lib/statement-recalculator";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ServerPatchIncomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ),
  accountId: z.string().min(1, "Account is required"),
  incomeTypeId: z.string().min(1, "Income type is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().max(500).optional(),
});

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    }); 

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const incomeTransaction = await db.incomeTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!incomeTransaction) {
      return NextResponse.json(
        { error: 'Income transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(incomeTransaction, { status: 200 });
  } catch (error) {
    console.error('Error getting income transaction: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    }); 

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const parseResult = ServerPatchIncomeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, amount, accountId, incomeTypeId, date, description } = parseResult.data;

    const existingTransaction = await db.incomeTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Income transaction not found' },
        { status: 404 }
      );
    }

    const oldAmount = parseFloat(existingTransaction.amount.toString());
    const newAmount = parseFloat(amount);
    const balanceDifference = newAmount - oldAmount;

    const result = await db.$transaction(async (tx) => {
      const updatedTransaction = await tx.incomeTransaction.update({
        where: {
          id: id,
          userId: session.user.id,
        },
        data: {
          name,
          amount: newAmount,
          accountId,
          incomeTypeId,
          date: new Date(date),
          description: description || null,
        },
        include: {
          account: true,
          incomeType: true,
        },
      });

      if (balanceDifference !== 0) {
        await tx.financialAccount.update({
          where: {
            id: accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              increment: balanceDifference,
            },
          },
        });
      }

      return updatedTransaction;
    });

    await onIncomeTransactionChange(
      accountId,
      new Date(date),
      existingTransaction.date
    );

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Error updating income transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params } : { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existingTransaction = await db.incomeTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Income transaction not found' },
        { status: 404 }
      );
    }

    const transactionAmount = parseFloat(existingTransaction.amount.toString());

    await db.$transaction(async (tx) => {
      await tx.incomeTransaction.delete({
        where: {
          id: id,
          userId: session.user.id,
        },
      });

      await tx.financialAccount.update({
        where: {
          id: existingTransaction.accountId,
          userId: session.user.id,
        },
        data: {
          currentBalance: {
            decrement: transactionAmount,
          },
        },
      });
    });

    await onIncomeTransactionChange(
      existingTransaction.accountId,
      existingTransaction.date
    );

    return NextResponse.json(
      { message: 'Income transaction deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting income transaction: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}