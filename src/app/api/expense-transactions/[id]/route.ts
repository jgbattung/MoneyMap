import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { onExpenseTransactionChange } from "@/lib/statement-recalculator";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PrismaPromise } from "@prisma/client";
import { z } from "zod";

const ServerPatchExpenseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ).optional(),
  accountId: z.string().optional(),
  expenseTypeId: z.string().optional(),
  expenseSubcategoryId: z.string().nullable().optional(),
  date: z.string().optional(),
  description: z.string().nullable().optional(),
  isInstallment: z.boolean().optional(),
  installmentDuration: z.coerce.number().int().positive().nullable().optional(),
  installmentStartDate: z.string().nullable().optional(),
  remainingInstallments: z.coerce.number().int().optional(),
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

    const expenseTransaction = await db.expenseTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        account: true,
        expenseType: true,
        expenseSubcategory: true,
        tags: true,
      },
    });

    if (!expenseTransaction) {
      return NextResponse.json(
        { error: 'Expense transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(expenseTransaction, { status: 200 });
  } catch (error) {
    console.error('Error getting expense transaction: ', error);
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

    const parseResult = ServerPatchExpenseSchema.safeParse(body);
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
      expenseTypeId,
      expenseSubcategoryId,
      date,
      description,
      isInstallment,
      installmentDuration,
      installmentStartDate,
      remainingInstallments,
      tagIds,
    } = parseResult.data;

    const existingExpense = await db.expenseTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense transaction not found' },
        { status: 404 }
      );
    }

    // Validate subcategory belongs to expense type if provided
    if (expenseSubcategoryId !== undefined) {
      if (expenseSubcategoryId !== null) {
        const subcategory = await db.expenseSubcategory.findUnique({
          where: {
            id: expenseSubcategoryId,
            userId: session.user.id,
          },
        });

        if (!subcategory) {
          return NextResponse.json(
            { error: 'Subcategory not found' },
            { status: 404 }
          );
        }

        const targetExpenseTypeId = expenseTypeId !== undefined ? expenseTypeId : existingExpense.expenseTypeId;

        if (subcategory.expenseTypeId !== targetExpenseTypeId) {
          return NextResponse.json(
            { error: 'Subcategory does not belong to the selected expense type' },
            { status: 400 }
          );
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    const operations: PrismaPromise<unknown>[] = [];

    if (name !== undefined) updateData.name = name;
    if (tagIds !== undefined) updateData.tags = { set: tagIds.map((id) => ({ id })) };
    if (expenseTypeId !== undefined) updateData.expenseTypeId = expenseTypeId;
    if (expenseSubcategoryId !== undefined) updateData.expenseSubcategoryId = expenseSubcategoryId;
    if (date !== undefined) updateData.date = new Date(date);
    if (description !== undefined) updateData.description = description || null;
    if (isInstallment !== undefined) updateData.isInstallment = isInstallment;
    if (installmentStartDate !== undefined) updateData.installmentStartDate = installmentStartDate ? new Date(installmentStartDate) : null;
    if (remainingInstallments !== undefined) updateData.remainingInstallments = remainingInstallments;

    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      updateData.amount = parsedAmount;

      let monthlyAmount: number | null = null;

      if (isInstallment && installmentDuration) {
        monthlyAmount = parsedAmount / installmentDuration;
        updateData.installmentDuration = installmentDuration;
        updateData.monthlyAmount = monthlyAmount;

        if (remainingInstallments === undefined) {
          updateData.remainingInstallments = installmentDuration;
        }
      }

      const oldAmount = existingExpense.isInstallment && existingExpense.monthlyAmount
        ? parseFloat(existingExpense.monthlyAmount.toString())
        : parseFloat(existingExpense.amount.toString());

      const newAmount = isInstallment && monthlyAmount
        ? monthlyAmount
        : parsedAmount;

      const balanceDifference = newAmount - oldAmount;

      if (accountId !== undefined && accountId !== existingExpense.accountId) {
        operations.push(
          db.financialAccount.update({
            where: {
              id: existingExpense.accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                increment: oldAmount,
              },
            },
          })
        );

        operations.push(
          db.financialAccount.update({
            where: {
              id: accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                decrement: newAmount,
              },
            },
          })
        );

        updateData.accountId = accountId;
      } else {
        operations.push(
          db.financialAccount.update({
            where: {
              id: existingExpense.accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                decrement: balanceDifference,
              },
            },
          })
        );
      }
    } else if (accountId !== undefined && accountId !== existingExpense.accountId) {
      const amountToMove = existingExpense.isInstallment && existingExpense.monthlyAmount
        ? parseFloat(existingExpense.monthlyAmount.toString())
        : parseFloat(existingExpense.amount.toString());

      operations.push(
        db.financialAccount.update({
          where: {
            id: existingExpense.accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              increment: amountToMove,
            },
          },
        })
      );

      operations.push(
        db.financialAccount.update({
          where: {
            id: accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              decrement: amountToMove,
            },
          },
        })
      );

      updateData.accountId = accountId;
    }

    operations.push(
      db.expenseTransaction.update({
        where: {
          id,
          userId: session.user.id,
        },
        data: updateData,
        include: {
          tags: true,
        },
      })
    );

    const results = await db.$transaction(operations);
    const result = results[results.length - 1] as { accountId: string; date: Date };

    await onExpenseTransactionChange(existingExpense.accountId, existingExpense.date);
    await onExpenseTransactionChange(result.accountId, result.date);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error updating expense transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const INSTALLMENT_STATUS = {
  active: "ACTIVE",
  cancelled: "CANCELLED",
  completed: "COMPLETED",
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const existingExpense = await db.expenseTransaction.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense transaction not found' },
        { status: 404 }
      );
    }

    if (existingExpense.isInstallment) {
      return NextResponse.json(
        { error: 'Use DELETE /api/installments/[id] to delete an installment' },
        { status: 400 }
      );
    }

    // Regular expense or payment record: Hard delete
    const operations: PrismaPromise<unknown>[] = [];

    // Reverse the balance deduction
    if (!existingExpense.isSystemGenerated) {
      const amountToReverse = parseFloat(existingExpense.amount.toString());

      operations.push(
        db.financialAccount.update({
          where: {
            id: existingExpense.accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              increment: amountToReverse,
            },
          },
        })
      );
    }

    // Delete the expense record
    operations.push(
      db.expenseTransaction.delete({
        where: {
          id: id,
          userId: session.user.id,
        },
      })
    );

    await db.$transaction(operations);

    await onExpenseTransactionChange(existingExpense.accountId, existingExpense.date);

    return NextResponse.json(
      { message: 'Expense deleted successfully', deleted: true },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting expense transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}