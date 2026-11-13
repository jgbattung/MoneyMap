import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PayPlanSchema } from "@/lib/validations/pay-division";

export const dynamic = 'force-dynamic';

const planInclude = {
  sourceAccount: { select: { id: true, name: true } },
  saveAccount: { select: { id: true, name: true } },
  spendAccount: { select: { id: true, name: true } },
  transferType: { select: { id: true, name: true } },
} as const;

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plans = await db.payPlan.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
      include: planInclude,
    });

    return NextResponse.json(plans, { status: 200 });
  } catch (error) {
    console.error('Error getting pay plans: ', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const parseResult = PayPlanSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, savePercent, sourceAccountId, saveAccountId, spendAccountId, transferTypeId, lines } =
      parseResult.data;
    const userId = session.user.id;

    const accountIds = [...new Set([sourceAccountId, saveAccountId, spendAccountId])];
    const [accountCount, typeCount] = await Promise.all([
      db.financialAccount.count({ where: { id: { in: accountIds }, userId } }),
      db.transferType.count({ where: { id: transferTypeId, userId } }),
    ]);

    if (accountCount !== accountIds.length || typeCount !== 1) {
      return NextResponse.json(
        { error: 'Account or transfer type not found' },
        { status: 400 }
      );
    }

    const plan = await db.payPlan.create({
      data: {
        userId,
        name,
        savePercent,
        sourceAccountId,
        saveAccountId,
        spendAccountId,
        transferTypeId,
        lines: lines as Prisma.InputJsonValue,
      },
      include: planInclude,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('Error creating pay plan: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A plan with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
