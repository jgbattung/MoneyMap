import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  requst: NextRequest,
  { params } : { params: { id: string } }
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
  { params } : { params : { id: string } }
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

    const { 
      name, 
      amount, 
      accountId, 
      expenseTypeId, 
      date, 
      description,
      isInstallment,
      installmentDuration,
      installmentStartDate,
      remainingInstallments
    } = body;

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

    const result = await db.$transaction(async (tx) => {
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (expenseTypeId !== undefined) updateData.expenseTypeId = expenseTypeId;
      if (date !== undefined) updateData.date = new Date(date);
      if (description !== undefined) updateData.description = description || null;
      if (isInstallment !== undefined) updateData.isInstallment = isInstallment;
      if (installmentStartDate !== undefined) updateData.installmentStartDate = installmentStartDate ? new Date(installmentStartDate) : null;
      if (remainingInstallments !== undefined) updateData.remainingInstallments = parseInt(remainingInstallments);

      if (amount !== undefined) {
        const parsedAmount = parseFloat(amount);
        updateData.amount = parsedAmount;

        let monthlyAmount: number | null = null;

        if (isInstallment && installmentDuration) {
          monthlyAmount = parsedAmount / parseInt(installmentDuration);
          updateData.installmentDuration = parseInt(installmentDuration);
          updateData.monthlyAmount = monthlyAmount;
          
          if (remainingInstallments === undefined) {
            updateData.remainingInstallments = parseInt(installmentDuration);
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
          await tx.financialAccount.update({
            where: {
              id: existingExpense.accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                increment: oldAmount,
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
                decrement: newAmount,
              },
            },
          });

          updateData.accountId = accountId;
        } else {
          await tx.financialAccount.update({
            where: {
              id: existingExpense.accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                decrement: balanceDifference,
              },
            },
          });
        }
      } else if (accountId !== undefined && accountId !== existingExpense.accountId) {
        const amountToMove = existingExpense.isInstallment && existingExpense.monthlyAmount
          ? parseFloat(existingExpense.monthlyAmount.toString())
          : parseFloat(existingExpense.amount.toString());

        await tx.financialAccount.update({
          where: {
            id: existingExpense.accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              increment: amountToMove,
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
              decrement: amountToMove,
            },
          },
        });

        updateData.accountId = accountId;
      }

      const updatedExpense = await tx.expenseTransaction.update({
        where: {
          id,
          userId: session.user.id,
        },
        data: updateData,
      });

      return updatedExpense;
    });
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
  { params }: { params: { id: string } }
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
      // Mark as CANCELLED for master installment expense transaction
      await db.expenseTransaction.update({
        where: {
          id: id,
          userId: session.user.id,
        },
        data: {
          installmentStatus: INSTALLMENT_STATUS.cancelled,
        },
      });

      return NextResponse.json(
        { message: 'Installment cancelled successfully', cancelled: true },
        { status: 200 }
      );
    }

    // Regular expense or payment record: Hard delete
    await db.$transaction(async (tx) => {
      // Reverse the balance deduction
      if (!existingExpense.isSystemGenerated) {
        const amountToReverse = parseFloat(existingExpense.amount.toString());
        
        await tx.financialAccount.update({
          where: {
            id: existingExpense.accountId,
            userId: session.user.id,
          },
          data: {
            currentBalance: {
              increment: amountToReverse,
            },
          },
        });
      }

      // Delete the expense record
      await tx.expenseTransaction.delete({
        where: {
          id: id,
          userId: session.user.id,
        },
      });
    });

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