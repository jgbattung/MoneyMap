import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { buildTransferWhere, parseListParams } from "@/lib/transaction-where";
import { PrismaPromise } from "@prisma/client";
import { randomUUID } from "crypto";
import { onTransferTransactionChange } from "@/lib/statement-recalculator";
import { z } from "zod";

const ServerPostTransferSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ),
  fromAccountId: z.string().min(1, "From account is required"),
  toAccountId: z.string().min(1, "To account is required"),
  transferTypeId: z.string().min(1, "Transfer type is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  feeAmount: z.string().optional().refine(
    (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
    { message: "Fee amount must be a positive number" }
  ),
  tagIds: z.array(z.string()).max(10).optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "From account and to account must be different",
  path: ["toAccountId"],
});

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

    // Get params from URL
    const { searchParams } = new URL(request.url);
    const parsed = parseListParams(searchParams, 'transfer');
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { skip, take } = parsed.data;
    const whereClause = buildTransferWhere(session.user.id, parsed.data);

    const [total, transferTransactions] = await Promise.all([
      db.transferTransaction.count({
        where: whereClause,
      }),
      db.transferTransaction.findMany({
        where: whereClause,
        include: {
          fromAccount: true,
          toAccount: true,
          transferType: true,
          tags: true,
        },
        orderBy: {
          date: 'desc',
        },
        ...(skip !== undefined && { skip }),
        ...(take !== undefined && { take }),
      }),
    ]);

    // Calculate hasMore
    const currentCount = (skip || 0) + transferTransactions.length;
    const hasMore = currentCount < total;

    return NextResponse.json({
      transactions: transferTransactions,
      total,
      hasMore,
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting transfer transactions: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
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

    const parseResult = ServerPostTransferSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, amount, fromAccountId, toAccountId, transferTypeId, date, notes, feeAmount, tagIds } = parseResult.data;

    const operations: PrismaPromise<unknown>[] = [];
    let feeExpenseId: string | null = null;
    let transferIndex = 0;

    if (feeAmount && parseFloat(feeAmount) > 0) {
      // Parallelize the two independent pre-transaction read lookups
      const [foundFeeType, fromAccount] = await Promise.all([
        db.expenseType.findFirst({
          where: {
            userId: session.user.id,
            name: "Transfer fee",
          },
        }),
        db.financialAccount.findUnique({
          where: { id: fromAccountId },
          select: { name: true },
        }),
      ]);
      let transferFeeType = foundFeeType;

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

      feeExpenseId = randomUUID();

      operations.push(
        db.expenseTransaction.create({
          data: {
            id: feeExpenseId,
            userId: session.user.id,
            accountId: fromAccountId,
            expenseTypeId: transferFeeType.id,
            name: `Transfer fee: ${name}`,
            amount: parseFloat(feeAmount),
            date: new Date(date),
            description: `Deducted from ${fromAccount?.name}`,
          },
        })
      );

      operations.push(
        db.financialAccount.update({
          where: { id: fromAccountId },
          data: { currentBalance: { decrement: parseFloat(feeAmount) } },
        })
      );

      transferIndex = 2;
    }

    // Create the transfer transaction
    operations.push(
      db.transferTransaction.create({
        data: {
          userId: session.user.id,
          name: name,
          amount: parseFloat(amount),
          fromAccountId,
          toAccountId,
          transferTypeId,
          date: new Date(date),
          notes: notes || null,
          feeAmount: feeAmount ? parseFloat(feeAmount) : null,
          feeExpenseId: feeExpenseId,
          ...(tagIds && tagIds.length > 0 && {
            tags: { connect: tagIds.map((id) => ({ id })) },
          }),
        },
        include: {
          fromAccount: true,
          toAccount: true,
          transferType: true,
          feeExpense: true,
          tags: true,
        }
      })
    );

    operations.push(
      db.financialAccount.update({
        where: { id: fromAccountId },
        data: { currentBalance: { decrement: parseFloat(amount) } },
      })
    );

    operations.push(
      db.financialAccount.update({
        where: { id: toAccountId },
        data: { currentBalance: { increment: parseFloat(amount) } },
      })
    );

    const results = await db.$transaction(operations);
    const result = results[transferIndex] as { fromAccountId: string; toAccountId: string; transferTypeId: string; date: Date };
    const fromAccountResult = results[transferIndex + 1] as { accountType?: string } | undefined;
    const toAccountResult = results[transferIndex + 2] as { accountType?: string } | undefined;

    const txFromAccountId = result.fromAccountId;
    const txToAccountId = result.toAccountId;
    const txTransferTypeId = result.transferTypeId;
    const txDate = result.date;
    const fromAccountType = fromAccountResult?.accountType;
    const toAccountType = toAccountResult?.accountType;

    after(async () => {
      try {
        await onTransferTransactionChange(txFromAccountId, txToAccountId, txTransferTypeId, txDate, undefined, fromAccountType, toAccountType);
      } catch (err) {
        console.error('Error in deferred onTransferTransactionChange (POST transfer):', err);
      }
    });

    return NextResponse.json(results[transferIndex], { status: 201 });

  } catch (error) {
    console.error('Error creating transfer transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}