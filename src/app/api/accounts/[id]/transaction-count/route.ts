import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
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

    // Verify account belongs to user
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

    // Count all associated transactions
    const [incomeCount, expenseCount, transferFromCount, transferToCount] = await Promise.all([
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

    const totalCount = incomeCount + expenseCount + transferFromCount + transferToCount;

    return NextResponse.json(
      { count: totalCount },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error getting transaction count: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}