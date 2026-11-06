import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { buildIncomeWhere, parseListParams } from "@/lib/transaction-where";
import { PrismaPromise } from "@prisma/client";
import { onIncomeTransactionChange } from "@/lib/statement-recalculator";
import { z } from "zod";

const ServerPostIncomeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ),
  accountId: z.string().min(1, "Account is required"),
  incomeTypeId: z.string().min(1, "Income type is required"),
  date: z.string().min(1, "Date is required"),
  description: z.string().max(500).optional(),
  tagIds: z.array(z.string()).max(10).optional(),
});

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseListParams(searchParams, 'income');
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { skip, take } = parsed.data;
    const whereClause = buildIncomeWhere(session.user.id, parsed.data);

    const [total, incomeTransactions, aggregate] = await Promise.all([
      db.incomeTransaction.count({
        where: whereClause,
      }),
      db.incomeTransaction.findMany({
        where: whereClause,
        include: {
          account: true,
          incomeType: true,
          tags: true,
        },
        orderBy: {
          date: 'desc',
        },
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
      }),
      db.incomeTransaction.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
    ]);

    // Calculate hasMore
    const currentCount = (skip || 0) + incomeTransactions.length;
    const hasMore = currentCount < total;

    return NextResponse.json({
      transactions: incomeTransactions,
      total,
      totalAmount: aggregate._sum.amount?.toString() ?? '0',
      hasMore,
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting income transactions: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const parseResult = ServerPostIncomeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, amount, accountId, incomeTypeId, date, description, tagIds } = parseResult.data;

    const operations: PrismaPromise<unknown>[] = [
      db.financialAccount.update({
        where: {
          id: accountId,
          userId: session.user.id,
        },
        data: {
          currentBalance: {
            increment: parseFloat(amount),
          },
        },
      }),
      db.incomeTransaction.create({
        data: {
          userId: session.user.id,
          name,
          amount: parseFloat(amount),
          accountId,
          incomeTypeId,
          date: new Date(date),
          description: description || null,
          ...(tagIds && tagIds.length > 0 && {
            tags: { connect: tagIds.map((id) => ({ id })) },
          }),
        },
        include: {
          account: true,
          incomeType: true,
          tags: true,
        }
      }),
    ];

    const results = await db.$transaction(operations);
    const result = results[results.length - 1];
    const accountResult = results[0] as { accountType?: string } | undefined;
    const accountType = accountResult?.accountType;
    const txDate = new Date(date);

    after(async () => {
      try {
        await onIncomeTransactionChange(accountId, txDate, undefined, accountType);
      } catch (err) {
        console.error('Error in deferred onIncomeTransactionChange (POST income):', err);
      }
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating income transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}