import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { onExpenseTransactionChange } from "@/lib/statement-recalculator";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { PrismaPromise } from "@prisma/client";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const LOCKED_FIELDS = [
  'installmentDuration',
  'accountId',
  'tagIds',
  'isInstallment',
  'remainingInstallments',
  'monthlyAmount',
  'lastProcessedDate',
  'installmentStatus',
  'parentInstallmentId',
  'isSystemGenerated',
];

const ServerPatchInstallmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ).optional(),
  installmentStartDate: z.string().optional(),
  expenseTypeId: z.string().optional(),
  expenseSubcategoryId: z.string().nullable().optional(),
}).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const installment = await db.expenseTransaction.findUnique({
      where: { id, userId: session.user.id },
      include: {
        account: true,
        expenseType: true,
        expenseSubcategory: true,
      },
    });

    if (!installment || !installment.isInstallment || installment.installmentStatus === 'CANCELLED') {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    return NextResponse.json(installment, { status: 200 });
  } catch (error) {
    console.error('Error getting installment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Reject locked fields explicitly for a cleaner error message
    for (const field of LOCKED_FIELDS) {
      if (field in body) {
        return NextResponse.json(
          { error: `Field not editable: ${field}` },
          { status: 400 }
        );
      }
    }

    const parseResult = ServerPatchInstallmentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, amount, installmentStartDate, expenseTypeId, expenseSubcategoryId } = parseResult.data;

    const existing = await db.expenseTransaction.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    if (!existing.isInstallment) {
      return NextResponse.json({ error: 'Not an installment' }, { status: 400 });
    }

    if (existing.installmentStatus === 'CANCELLED') {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    // Validate subcategory if provided
    if (expenseSubcategoryId !== undefined && expenseSubcategoryId !== null) {
      const subcategory = await db.expenseSubcategory.findUnique({
        where: { id: expenseSubcategoryId, userId: session.user.id },
      });

      if (!subcategory) {
        return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
      }

      const targetExpenseTypeId = expenseTypeId !== undefined ? expenseTypeId : existing.expenseTypeId;

      if (subcategory.expenseTypeId !== targetExpenseTypeId) {
        return NextResponse.json(
          { error: 'Subcategory does not belong to the selected expense type' },
          { status: 400 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    const operations: PrismaPromise<unknown>[] = [];

    if (name !== undefined) updateData.name = name;
    if (expenseTypeId !== undefined) updateData.expenseTypeId = expenseTypeId;
    if (expenseSubcategoryId !== undefined) updateData.expenseSubcategoryId = expenseSubcategoryId;

    if (amount !== undefined) {
      const newAmount = parseFloat(amount);
      updateData.amount = newAmount;
      updateData.monthlyAmount = newAmount / existing.installmentDuration!;
    }

    let startDateChanged = false;
    let oldStartForRecalc = existing.date;
    let newStartForRecalc: Date | undefined;

    if (installmentStartDate !== undefined) {
      const oldStart = new Date(existing.installmentStartDate!);
      oldStart.setHours(0, 0, 0, 0);

      const newStart = new Date(installmentStartDate);
      newStart.setHours(0, 0, 0, 0);

      updateData.installmentStartDate = newStart;
      updateData.date = newStart;
      startDateChanged = true;
      oldStartForRecalc = existing.date;
      newStartForRecalc = newStart;

      if (newStart.getTime() > oldStart.getTime()) {
        // Moved forward — delete children before the new start date
        const children = await db.expenseTransaction.findMany({
          where: { parentInstallmentId: id, userId: session.user.id },
        });

        const childrenToDelete = children.filter(
          (c) => new Date(c.date) < newStart
        );

        for (const child of childrenToDelete) {
          operations.push(
            db.financialAccount.update({
              where: { id: child.accountId, userId: session.user.id },
              data: { currentBalance: { increment: parseFloat(child.amount.toString()) } },
            })
          );
          operations.push(
            db.expenseTransaction.delete({ where: { id: child.id } })
          );
        }

        updateData.remainingInstallments = existing.installmentDuration;
        updateData.lastProcessedDate = null;
      }
    }

    operations.push(
      db.expenseTransaction.update({
        where: { id, userId: session.user.id },
        data: updateData,
        include: { account: true, expenseType: true, expenseSubcategory: true },
      })
    );

    const results = await db.$transaction(operations);
    const updated = results[results.length - 1];

    await onExpenseTransactionChange(existing.accountId, oldStartForRecalc);
    if (startDateChanged && newStartForRecalc) {
      await onExpenseTransactionChange(existing.accountId, newStartForRecalc);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error updating installment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await db.expenseTransaction.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    if (!existing.isInstallment) {
      return NextResponse.json({ error: 'Not an installment' }, { status: 400 });
    }

    if (existing.installmentStatus === 'CANCELLED') {
      return NextResponse.json({ error: 'Installment not found' }, { status: 404 });
    }

    const children = await db.expenseTransaction.findMany({
      where: { parentInstallmentId: id, userId: session.user.id },
    });

    const operations: PrismaPromise<unknown>[] = [];

    for (const child of children) {
      operations.push(
        db.financialAccount.update({
          where: { id: child.accountId, userId: session.user.id },
          data: { currentBalance: { increment: parseFloat(child.amount.toString()) } },
        })
      );
    }

    operations.push(
      db.expenseTransaction.deleteMany({
        where: { parentInstallmentId: id, userId: session.user.id },
      })
    );

    operations.push(
      db.expenseTransaction.delete({
        where: { id, userId: session.user.id },
      })
    );

    await db.$transaction(operations);

    await onExpenseTransactionChange(existing.accountId, existing.date);

    return NextResponse.json(
      { message: 'Installment deleted successfully', deleted: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting installment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
