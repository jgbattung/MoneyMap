import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') ?? 'ACTIVE';

    if (statusParam !== 'ACTIVE' && statusParam !== 'ALL') {
      return NextResponse.json(
        { error: 'Invalid status parameter. Must be "ACTIVE" or "ALL".' },
        { status: 400 }
      );
    }

    const installmentStatusFilter = statusParam === 'ALL'
      ? { in: ['ACTIVE', 'COMPLETED'] }
      : 'ACTIVE';

    const installments = await db.expenseTransaction.findMany({
      where: {
        userId: session.user.id,
        isInstallment: true,
        installmentStatus: installmentStatusFilter,
      },
      include: {
        account: true,
        expenseType: true,
        expenseSubcategory: true,
      },
      orderBy: {
        installmentStartDate: 'desc',
      },
    });

    return NextResponse.json({ installments }, { status: 200 });
  } catch (error) {
    console.error('Error getting installments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
