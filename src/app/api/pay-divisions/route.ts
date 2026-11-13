import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import * as z from "zod";
import { db } from "@/lib/prisma";
import {
  buildDivisionItems,
  computePayDivision,
  fromCentavos,
} from "@/lib/pay-division";
import { CreatePayDivisionSchema, PayPlanLineSchema } from "@/lib/validations/pay-division";

export const dynamic = 'force-dynamic';

const StoredLinesSchema = z.array(PayPlanLineSchema);

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const divisions = await db.payDivision.findMany({
      where: { userId: session.user.id },
      orderBy: [{ payDate: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            fromAccount: { select: { id: true, name: true } },
            toAccount: { select: { id: true, name: true } },
            transferTransaction: { select: { id: true, amount: true, date: true } },
          },
        },
      },
    });

    return NextResponse.json(divisions, { status: 200 });
  } catch (error) {
    console.error('Error getting pay divisions: ', error);
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

    const parseResult = CreatePayDivisionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { planId, payAmount, payDate, incomeTransactionId } = parseResult.data;
    const userId = session.user.id;

    const [plan, income] = await Promise.all([
      db.payPlan.findFirst({ where: { id: planId, userId } }),
      incomeTransactionId
        ? db.incomeTransaction.findFirst({
            where: { id: incomeTransactionId, userId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!plan) {
      return NextResponse.json({ error: 'Pay plan not found' }, { status: 404 });
    }
    if (incomeTransactionId && !income) {
      return NextResponse.json({ error: 'Income transaction not found' }, { status: 404 });
    }
    if (
      !plan.sourceAccountId ||
      !plan.saveAccountId ||
      !plan.spendAccountId ||
      !plan.transferTypeId
    ) {
      return NextResponse.json(
        { error: 'This plan is missing an account or transfer type' },
        { status: 400 }
      );
    }

    const linesResult = StoredLinesSchema.safeParse(plan.lines);
    if (!linesResult.success) {
      return NextResponse.json({ error: 'This plan has invalid lines' }, { status: 400 });
    }

    // Always recompute here; amounts are never taken from the client.
    const result = computePayDivision({
      payAmount,
      savePercent: String(plan.savePercent),
      lines: linesResult.data,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const drafts = buildDivisionItems(result, {
      sourceAccountId: plan.sourceAccountId,
      saveAccountId: plan.saveAccountId,
      spendAccountId: plan.spendAccountId,
    });
    const transferTypeId = plan.transferTypeId;

    const divisionId = randomUUID();
    const ids = drafts.map(() => randomUUID());
    const toRow = (draft: (typeof drafts)[number], index: number) => ({
      id: ids[index],
      kind: draft.kind,
      label: draft.label,
      detail: draft.detail,
      amount: fromCentavos(draft.amountC),
      sortOrder: draft.sortOrder,
      parentItemId: draft.parentIndex === null ? null : ids[draft.parentIndex],
      fromAccountId: draft.fromAccountId,
      toAccountId: draft.toAccountId,
      transferTypeId: draft.kind === 'TRANSFER' ? transferTypeId : null,
    });

    const parentRows = drafts.flatMap((d, i) => (d.parentIndex === null ? [toRow(d, i)] : []));
    const childRows = drafts.flatMap((d, i) =>
      d.parentIndex === null ? [] : [{ ...toRow(d, i), divisionId }]
    );

    const operations = [
      db.payDivision.create({
        data: {
          id: divisionId,
          userId,
          planId: plan.id,
          planName: plan.name,
          savePercent: plan.savePercent,
          payAmount: fromCentavos(result.payC),
          saveAmount: fromCentavos(result.saveC),
          spendAmount: fromCentavos(result.spendC),
          payDate: new Date(payDate),
          incomeTransactionId: incomeTransactionId ?? null,
          items: { create: parentRows },
        },
      }),
      ...(childRows.length > 0 ? [db.payDivisionItem.createMany({ data: childRows })] : []),
    ];

    await db.$transaction(operations);

    return NextResponse.json({ id: divisionId }, { status: 201 });
  } catch (error) {
    console.error('Error creating pay division: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This income transaction already has a division' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
