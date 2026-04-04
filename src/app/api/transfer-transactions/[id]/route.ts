import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { onTransferTransactionChange } from "@/lib/statement-recalculator";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PrismaPromise } from "@prisma/client";
import { randomUUID } from "crypto";
import { z } from "zod";

const ServerPatchTransferSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  amount: z.coerce.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ).optional(),
  fromAccountId: z.string().min(1, "From account is required").optional(),
  toAccountId: z.string().min(1, "To account is required").optional(),
  transferTypeId: z.string().min(1, "Transfer type is required").optional(),
  date: z.string().min(1, "Date is required").optional(),
  notes: z.string().nullable().optional(),
  feeAmount: z.string().nullable().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
    { message: "Fee amount must be a positive number" }
  ),
  tagIds: z.array(z.string()).max(10).optional(),
}).refine(
  (data) => {
    if (data.fromAccountId !== undefined && data.toAccountId !== undefined) {
      return data.fromAccountId !== data.toAccountId;
    }
    return true;
  },
  { message: "From account and to account must be different", path: ["toAccountId"] }
);

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

    const transferTransaction = await db.transferTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        feeExpense: true,
      },
    });

    if (!transferTransaction) {
      return NextResponse.json(
        { error: 'Transfer transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transferTransaction, { status: 200 });
  } catch (error) {
    console.error('Error getting transfer transaction: ', error);
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

    const parseResult = ServerPatchTransferSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      amount,
      fromAccountId,
      toAccountId,
      transferTypeId,
      date,
      notes,
      feeAmount,
      tagIds,
    } = parseResult.data;

    const existingTransfer = await db.transferTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        feeExpense: true,
      },
    });

    if (!existingTransfer) {
      return NextResponse.json(
        { error: 'Transfer transaction not found' },
        { status: 404 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    const operations: PrismaPromise<unknown>[] = [];

    if (name !== undefined) updateData.name = name;
    if (tagIds !== undefined) updateData.tags = { set: tagIds.map((id) => ({ id })) };
    if (transferTypeId !== undefined) updateData.transferTypeId = transferTypeId;
    if (date !== undefined) updateData.date = new Date(date);
    if (notes !== undefined) updateData.notes = notes || null;

    const effectiveFromAccountId = fromAccountId ?? existingTransfer.fromAccountId;
    const effectiveToAccountId = toAccountId ?? existingTransfer.toAccountId;
    const effectiveName = name ?? existingTransfer.name;
    const effectiveDate = date ? new Date(date) : existingTransfer.date;

    const oldAmount = parseFloat(existingTransfer.amount.toString());
    const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
    const amountDifference = newAmount - oldAmount;

    if (amount !== undefined) updateData.amount = newAmount;
    if (fromAccountId !== undefined) updateData.fromAccountId = fromAccountId;
    if (toAccountId !== undefined) updateData.toAccountId = toAccountId;

    const oldFeeAmount = existingTransfer.feeAmount ? parseFloat(existingTransfer.feeAmount.toString()) : null;
    const newFeeAmount = feeAmount !== undefined
      ? (feeAmount && parseFloat(feeAmount) > 0 ? parseFloat(feeAmount) : null)
      : oldFeeAmount;

    let newFeeExpenseId = existingTransfer.feeExpenseId;

    if (feeAmount !== undefined) {
      if (oldFeeAmount === null && newFeeAmount !== null) {
        // Fee added: move lookups before the transaction
        let transferFeeType = await db.expenseType.findFirst({
          where: { userId: session.user.id, name: "Transfer fee" },
        });

        if (!transferFeeType) {
          transferFeeType = await db.expenseType.create({
            data: {
              userId: session.user.id,
              name: "Transfer fee",
              isSystem: true,
              monthlyBudget: null,
            },
          });
        }

        const fromAccount = await db.financialAccount.findUnique({
          where: { id: effectiveFromAccountId },
          select: { name: true },
        });

        newFeeExpenseId = randomUUID();

        operations.push(
          db.expenseTransaction.create({
            data: {
              id: newFeeExpenseId,
              userId: session.user.id,
              accountId: effectiveFromAccountId,
              expenseTypeId: transferFeeType.id,
              name: `Transfer fee: ${effectiveName}`,
              amount: newFeeAmount,
              date: effectiveDate,
              description: `Deducted from ${fromAccount?.name}`,
            },
          })
        );

        operations.push(
          db.financialAccount.update({
            where: { id: effectiveFromAccountId },
            data: { currentBalance: { decrement: newFeeAmount } },
          })
        );
      } else if (oldFeeAmount !== null && newFeeAmount === null) {
        // Fee removed: delete fee expense
        if (existingTransfer.feeExpenseId) {
          operations.push(
            db.expenseTransaction.delete({
              where: { id: existingTransfer.feeExpenseId },
            })
          );
        }

        newFeeExpenseId = null;

        operations.push(
          db.financialAccount.update({
            where: { id: existingTransfer.fromAccountId },
            data: { currentBalance: { increment: oldFeeAmount } },
          })
        );
      } else if (oldFeeAmount !== null && newFeeAmount !== null) {
        // Fee updated
        const feeDifference = newFeeAmount - oldFeeAmount;
        const feeAccountChanged = existingTransfer.fromAccountId !== effectiveFromAccountId;

        if (existingTransfer.feeExpenseId) {
          const fromAccount = await db.financialAccount.findUnique({
            where: { id: effectiveFromAccountId },
            select: { name: true },
          });

          operations.push(
            db.expenseTransaction.update({
              where: { id: existingTransfer.feeExpenseId },
              data: {
                accountId: effectiveFromAccountId,
                name: `Transfer fee: ${effectiveName}`,
                amount: newFeeAmount,
                date: effectiveDate,
                description: `Deducted from ${fromAccount?.name}`,
              },
            })
          );

          if (feeAccountChanged) {
            operations.push(
              db.financialAccount.update({
                where: { id: existingTransfer.fromAccountId },
                data: { currentBalance: { increment: oldFeeAmount } },
              })
            );

            operations.push(
              db.financialAccount.update({
                where: { id: effectiveFromAccountId },
                data: { currentBalance: { decrement: newFeeAmount } },
              })
            );
          } else if (feeDifference !== 0) {
            operations.push(
              db.financialAccount.update({
                where: { id: effectiveFromAccountId },
                data: { currentBalance: { decrement: feeDifference } },
              })
            );
          }
        }
      }

      updateData.feeAmount = newFeeAmount;
      updateData.feeExpenseId = newFeeExpenseId;
    }

    const accountsChanged =
      existingTransfer.fromAccountId !== effectiveFromAccountId ||
      existingTransfer.toAccountId !== effectiveToAccountId;

    if (accountsChanged) {
      // Reverse the old transfer
      operations.push(
        db.financialAccount.update({
          where: { id: existingTransfer.fromAccountId },
          data: { currentBalance: { increment: oldAmount } },
        })
      );

      operations.push(
        db.financialAccount.update({
          where: { id: existingTransfer.toAccountId },
          data: { currentBalance: { decrement: oldAmount } },
        })
      );

      // Apply the new transfer
      operations.push(
        db.financialAccount.update({
          where: { id: effectiveFromAccountId },
          data: { currentBalance: { decrement: newAmount } },
        })
      );

      operations.push(
        db.financialAccount.update({
          where: { id: effectiveToAccountId },
          data: { currentBalance: { increment: newAmount } },
        })
      );
    } else if (amountDifference !== 0) {
      // Same accounts, amount changed
      operations.push(
        db.financialAccount.update({
          where: { id: effectiveFromAccountId },
          data: { currentBalance: { decrement: amountDifference } },
        })
      );

      operations.push(
        db.financialAccount.update({
          where: { id: effectiveToAccountId },
          data: { currentBalance: { increment: amountDifference } },
        })
      );
    }

    operations.push(
      db.transferTransaction.update({
        where: {
          id: id,
          userId: session.user.id,
        },
        data: updateData,
        include: {
          fromAccount: true,
          toAccount: true,
          transferType: true,
          feeExpense: true,
          tags: true,
        },
      })
    );

    const results = await db.$transaction(operations);
    const result = results[results.length - 1] as { fromAccountId: string; toAccountId: string; transferTypeId: string; date: Date };

    await onTransferTransactionChange(existingTransfer.fromAccountId, existingTransfer.toAccountId, existingTransfer.transferTypeId, existingTransfer.date);
    await onTransferTransactionChange(result.fromAccountId, result.toAccountId, result.transferTypeId, result.date);

    return NextResponse.json(results[results.length - 1], { status: 200 });
  } catch (error) {
    console.error('Error updating transfer transaction: ', error);

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

    const existingTransfer = await db.transferTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id
      },
    });

    if (!existingTransfer) {
      return NextResponse.json(
        { error: 'Transfer transaction not found' },
        { status: 404 }
      );
    }

    const operations: PrismaPromise<unknown>[] = [];

    // Reverse the transfer
    operations.push(
      db.financialAccount.update({
        where: { id: existingTransfer.fromAccountId },
        data: { currentBalance: { increment: existingTransfer.amount } },
      })
    );

    operations.push(
      db.financialAccount.update({
        where: { id: existingTransfer.toAccountId },
        data: { currentBalance: { decrement: existingTransfer.amount } },
      })
    );

    if (existingTransfer.feeAmount && existingTransfer.feeExpenseId) {
      const feeAmount = parseFloat(existingTransfer.feeAmount.toString());

      operations.push(
        db.financialAccount.update({
          where: { id: existingTransfer.fromAccountId },
          data: { currentBalance: { increment: feeAmount } },
        })
      );

      operations.push(
        db.expenseTransaction.delete({
          where: { id: existingTransfer.feeExpenseId },
        })
      );
    }

    // Delete the transfer transaction
    operations.push(
      db.transferTransaction.delete({
        where: {
          id: id,
          userId: session.user.id,
        },
      })
    );

    await db.$transaction(operations);

    await onTransferTransactionChange(existingTransfer.fromAccountId, existingTransfer.toAccountId, existingTransfer.transferTypeId, existingTransfer.date);

    return NextResponse.json(
      { message: 'Transfer transaction deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting transfer transaction: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}