import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { onTransferTransactionChange } from "@/lib/statement-recalculator";
import { RecordTransferSchema } from "@/lib/validations/pay-division";

export const dynamic = 'force-dynamic';

// Atomic tick: creates the TransferTransaction, applies both balance updates
// and links the checklist row in ONE transaction. Untick is the existing
// DELETE /api/transfer-transactions/[id] (the FK is SET NULL).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const parseResult = RecordTransferSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { amount, date } = parseResult.data;
    const userId = session.user.id;

    const item = await db.payDivisionItem.findFirst({
      where: { id: itemId, divisionId: id, division: { userId } },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }
    if (
      item.kind !== 'TRANSFER' ||
      !item.fromAccountId ||
      !item.toAccountId ||
      !item.transferTypeId
    ) {
      return NextResponse.json(
        { error: 'This row cannot record a transfer' },
        { status: 400 }
      );
    }
    if (item.transferTransactionId) {
      return NextResponse.json(
        { error: 'This transfer is already recorded' },
        { status: 409 }
      );
    }

    const { fromAccountId, toAccountId, transferTypeId } = item;
    const value = parseFloat(amount);

    let results;
    try {
      results = await db.$transaction([
        db.payDivisionItem.update({
          // Guard: only matches while the row is still unlinked (extra filter on a unique where).
          where: { id: itemId, AND: [{ transferTransactionId: null }] },
          data: {
            transferTransaction: {
              create: {
                userId,
                name: `Pay division: ${item.label}`.slice(0, 100),
                amount: value,
                fromAccountId,
                toAccountId,
                transferTypeId,
                date: new Date(date),
              },
            },
          },
          include: { transferTransaction: true },
        }),
        db.financialAccount.update({
          where: { id: fromAccountId },
          data: { currentBalance: { decrement: value } },
        }),
        db.financialAccount.update({
          where: { id: toAccountId },
          data: { currentBalance: { increment: value } },
        }),
      ]);
    } catch (error) {
      // A concurrent double tick fails the guarded update; the whole
      // transaction rolls back, so no balance was changed.
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return NextResponse.json(
          { error: 'This transfer is already recorded' },
          { status: 409 }
        );
      }
      throw error;
    }

    const [updatedItem, fromAccountResult, toAccountResult] = results as [
      unknown,
      { accountType?: string } | undefined,
      { accountType?: string } | undefined,
    ];
    const fromAccountType = fromAccountResult?.accountType;
    const toAccountType = toAccountResult?.accountType;
    const txDate = new Date(date);

    after(async () => {
      try {
        await onTransferTransactionChange(
          fromAccountId,
          toAccountId,
          transferTypeId,
          txDate,
          undefined,
          fromAccountType,
          toAccountType
        );
      } catch (err) {
        console.error('Error in deferred onTransferTransactionChange (pay division tick):', err);
      }
    });

    return NextResponse.json(updatedItem, { status: 201 });
  } catch (error) {
    console.error('Error recording pay division transfer: ', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
