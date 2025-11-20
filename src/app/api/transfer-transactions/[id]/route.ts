import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextResponse,
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
        { error: 'Trasnfer transaction not found' },
        { status: 404 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const oldAmount = existingTransfer.amount;
      const newAmount = parseFloat(amount);
      const amountDifference = newAmount - oldAmount;

      const oldFeeAmount = existingTransfer.feeAmount ? parseFloat(existingTransfer.feeAmount.toString()) : null;
      const newFeeAmount = feeAmount && parseFloat(feeAmount) > 0 ? parseFloat(feeAmount) : null;

      let newFeeExpenseId = existingTransfer.feeExpenseId;

      if (oldFeeAmount === null && newFeeAmount !== null) {
        let transferFeeType = await tx.expenseType.findFirst({
          where: {
            id: session.user.id,
            name: "Transfer fee",
          },
        });

        if (!transferFeeType) {
          transferFeeType = await tx.expenseType.create({
            data: {
              userId: session.user.id,
              name: "Transfer Fee",
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
            amount: newFeeAmount,
            date: new Date(date),
            description: `Deducted from ${fromAccount?.name}`,
          },
        });

        newFeeExpenseId = feeExpense.id;

        await tx.financialAccount.update({
          where: { id: fromAccountId },
          data: { currentBalance: { decrement: newFeeAmount } }
        });
      } else if (oldFeeAmount !== null && newFeeAmount === null) {
        if (existingTransfer.feeExpenseId) {
          await tx.expenseTransaction.delete({
            where: { id: existingTransfer.feeExpenseId },
          })
        }

        newFeeExpenseId = null;

        await tx.financialAccount.update({
          where: { id: existingTransfer.fromAccountId },
          data: { currentBalance: { increment: oldFeeAmount } }
        });
      } else if (oldFeeAmount !== null && newFeeAmount !== null) {
        const feeDifference = newFeeAmount - oldFeeAmount;
        const feeAccountChanged = existingTransfer.fromAccountId !== fromAccountId;

        if (existingTransfer.feeExpenseId) {
          const fromAccount = await tx.financialAccount.findUnique({
            where: { id: fromAccountId },
            select: { name: true },
          });

          await tx.expenseTransaction.update({
            where: { id: existingTransfer.feeExpenseId },
            data: {
              accountId: fromAccountId,
              name: `Transfer fee: ${name}`,
              amount: newFeeAmount,
              date: new Date(date),
              description: `Deducted from ${fromAccount?.name}`,
            },
          });

          if (feeAccountChanged) {
            await tx.financialAccount.update({
              where: { id: existingTransfer.fromAccountId },
              data: { currentBalance: { increment: oldFeeAmount } },
            });

            await tx.financialAccount.update({
              where: { id: fromAccountId },
              data: { currentBalance: { decrement: newFeeAmount } }
            });
          } else if (feeDifference !== 0) {
            await tx.financialAccount.update({
              where: { id: fromAccountId },
              data: { currentBalance: { decrement: feeDifference } }
            });
          }
         }
      }

      const accountsChanged = existingTransfer.fromAccountId === fromAccountId || existingTransfer.toAccountId === toAccountId;

      if (accountsChanged) {
        // Reverse the old transfer
        await tx.financialAccount.update({
          where: { id: existingTransfer.fromAccountId },
          data: { currentBalance: { increment: oldAmount } }
        });

        await tx.financialAccount.update({
          where: { id: existingTransfer.toAccountId },
          data: { currentBalance: { decrement: oldAmount } }
        });

        // Apply the new transfer
        await tx.financialAccount.update({
          where: { id: fromAccountId },
          data: { currentBalance: { decrement: newAmount } }
        });

        await tx.financialAccount.update({
          where: { id: toAccountId },
          data: { currentBalance: { increment: newAmount } }
        });
      } else if (amountDifference !== 0) {
        // Same accounts, but amount changed
        await tx.financialAccount.update({
          where: { id: fromAccountId },
          data: { currentBalance: { decrement: amountDifference } }
        });

        await tx.financialAccount.update({
          where: { id: toAccountId },
          data: { currentBalance: { increment: amountDifference } }
        });
      }

      const updatedTransfer = await tx.transferTransaction.update({
        where: {
          id: id,
          userId: session.user.id,
        },
        data: {
          name,
          amount: newAmount,
          fromAccountId,
          toAccountId,
          transferTypeId,
          date: new Date(date),
          notes: notes || null,
          feeAmount: newFeeAmount,
          feeExpenseId: newFeeExpenseId,
        },
        include: {
          fromAccount: true,
          toAccount: true,
          transferType: true,
          feeExpense: true,
        }
      });

      return updatedTransfer;
    });

    return NextResponse.json(result, { status: 200 });
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

    await db.$transaction(async (tx) => {
      // Reverse the transfer
      await tx.financialAccount.update({
        where: { id: existingTransfer.fromAccountId },
        data: { currentBalance: { increment: existingTransfer.amount } }
      });

      await tx.financialAccount.update({
        where: { id: existingTransfer.toAccountId },
        data: { currentBalance: { decrement: existingTransfer.amount } }
      });

      if (existingTransfer.feeAmount && existingTransfer.feeExpenseId) {
        const feeAmount = parseFloat(existingTransfer.feeAmount.toString());

        await tx.financialAccount.update({
          where: { id: existingTransfer.fromAccountId },
          data: { currentBalance: { increment: feeAmount } },
        });

        await tx.expenseTransaction.delete({
          where: { id: existingTransfer.feeExpenseId },
        });
      }

      // Delete the transfer transaction
      await tx.transferTransaction.delete({
        where: {
          id: id,
          userId: session.user.id,
        },
      });
    });

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