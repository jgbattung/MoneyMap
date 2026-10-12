import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { AccountValidation } from "@/lib/validations/account";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

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

    const account = await db.financialAccount.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(account, { status: 200 });

  } catch (error) {
    console.error('Error getting account: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


export async function PATCH(
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

    const body = await request.json();

    const result = AccountValidation.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, accountType, initialBalance, addToNetWorth, statementDate, dueDate } = result.data;

    const existing = await db.financialAccount.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
      select: { initialBalance: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const newInitialBalance = new Prisma.Decimal(initialBalance);
    const delta = newInitialBalance.minus(existing.initialBalance);

    try {
      const updatedAccount = await db.financialAccount.update({
        where: {
          id: id,
          userId: session.user.id,
          initialBalance: existing.initialBalance,
        },
        data: {
          name,
          accountType,
          initialBalance: newInitialBalance,
          ...(delta.isZero() ? {} : { currentBalance: { increment: delta } }),
          addToNetWorth: addToNetWorth ?? true,
          statementDate: statementDate ?? null,
          dueDate: dueDate ?? null,
        },
      });

      return NextResponse.json(updatedAccount, { status: 200 });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Account was changed by another request. Reload and try again.' },
          { status: 409 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error updating account: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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

    const account = await db.financialAccount.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Check for associated transactions
    const [incomeCount, expenseCount,transferFromCount, transferToCount] = await Promise.all([
      db.incomeTransaction.count({
        where: { accountId: id }
      }),
      db.expenseTransaction.count({
        where: { accountId: id }
      }),
      db.transferTransaction.count({
        where: { fromAccountId: id }
      }),
      db.transferTransaction.count({
        where: { toAccountId: id }
      }),
    ]);

    const totalTransactionCount = incomeCount + expenseCount + transferFromCount + transferToCount;

    if (totalTransactionCount > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete account with existing transactions",
          transactionCount: totalTransactionCount, 
        },
        { status: 400 },
      );
    }

    await db.financialAccount.delete({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting account: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}