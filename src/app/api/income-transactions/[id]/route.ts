import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { onIncomeTransactionChange } from "@/lib/statement-recalculator";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ServerPatchIncomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ).optional(),
  accountId: z.string().min(1, "Account is required").optional(),
  incomeTypeId: z.string().min(1, "Income type is required").optional(),
  date: z.string().min(1, "Date is required").optional(),
  description: z.string().max(500).nullable().optional(),
  tagIds: z.array(z.string()).max(10).optional(),
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

    const {
      name,
      amount,
      accountId,
      incomeTypeId,
      date,
      description,
      tagIds,
    } = parseResult.data;

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

    const result = await db.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (tagIds !== undefined) updateData.tags = { set: tagIds.map((id) => ({ id })) };
      if (incomeTypeId !== undefined) updateData.incomeTypeId = incomeTypeId;
      if (date !== undefined) updateData.date = new Date(date);
      if (description !== undefined) updateData.description = description || null;

      if (amount !== undefined) {
        const newAmount = parseFloat(amount);
        updateData.amount = newAmount;

        const oldAmount = parseFloat(existingTransaction.amount.toString());
        const balanceDifference = newAmount - oldAmount;

        if (accountId !== undefined && accountId !== existingTransaction.accountId) {
          // Account changed + amount changed: reverse old, apply new
          await tx.financialAccount.update({
            where: {
              id: existingTransaction.accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                decrement: oldAmount,
              },
            },
          });

          await tx.financialAccount.update({
            where: {
              id: accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                increment: newAmount,
              },
            },
          });

          updateData.accountId = accountId;
        } else {
          // Same account, amount changed
          await tx.financialAccount.update({
            where: {
              id: existingTransaction.accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                increment: balanceDifference,
              },
            },
          });
        }
      } else if (accountId !== undefined && accountId !== existingTransaction.accountId) {
        // Account changed, amount unchanged: move existing amount
        const amountToMove = parseFloat(existingTransaction.amount.toString());

        await tx.financialAccount.update({
          where: {
            id: existingTransaction.accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              decrement: amountToMove,
            },
          },
        });

        await tx.financialAccount.update({
          where: {
            id: accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              increment: amountToMove,
            },
          },
        });

        updateData.accountId = accountId;
      }

      const updatedTransaction = await tx.incomeTransaction.update({
        where: {
          id,
          userId: session.user.id,
        },
        data: updateData,
        include: {
          account: true,
          incomeType: true,
          tags: true,
        },
      });

      return updatedTransaction;
    });

    await onIncomeTransactionChange(existingTransaction.accountId, existingTransaction.date);
    await onIncomeTransactionChange(result.accountId, result.date);

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

    await db.$transaction([
      db.incomeTransaction.delete({
        where: {
          id: id,
          userId: session.user.id,
        },
      }),
      db.financialAccount.update({
        where: {
          id: existingTransaction.accountId,
          userId: session.user.id,
        },
        data: {
          currentBalance: {
            decrement: transactionAmount,
          },
        },
      }),
    ]);

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