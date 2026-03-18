import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { INSTALLMENT_STATUS } from "./[id]/route";
import { Prisma } from "@prisma/client";
import { onExpenseTransactionChange } from "@/lib/statement-recalculator";
import { z } from "zod";

const ServerPostExpenseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Amount must be a positive number" }
  ),
  accountId: z.string().min(1, "Account is required"),
  expenseTypeId: z.string().min(1, "Expense type is required"),
  expenseSubcategoryId: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  isInstallment: z.boolean(),
  installmentDuration: z.coerce.number().int().positive().optional().nullable(),
  installmentStartDate: z.string().optional().nullable(),
  isSystemGenerated: z.boolean().optional(),
  parentInstallmentId: z.string().optional(),
  tagIds: z.array(z.string()).max(10).optional(),
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

    const { searchParams } = new URL(request.url);
    const skip = searchParams.get('skip');
    const take = searchParams.get('take');
    const search = searchParams.get('search');
    const dateFilter = searchParams.get('dateFilter');
    const accountId = searchParams.get('accountId');

    const skipNumber = skip ? Math.min(parseInt(skip), 10000) : undefined;
    const takeNumber = take ? Math.min(parseInt(take), 100) : undefined;

    const whereClause: Prisma.ExpenseTransactionWhereInput = {
      userId: session.user.id,
      isInstallment: false,
    };

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive' as Prisma.QueryMode,
          },
        },
        {
          account: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
        {
          expenseType: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
        {
          expenseSubcategory: {
            name: {
              contains: search,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
        {
          tags: {
            some: {
              name: {
                contains: search,
                mode: 'insensitive' as Prisma.QueryMode,
              },
            },
          },
        },
      ];
    }

    if (dateFilter && dateFilter !== 'view-all') {
      const now = new Date();
      
      if (dateFilter === 'this-month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        whereClause.date = {
          gte: startOfMonth,
          lte: endOfMonth,
        };
      } else if (dateFilter === 'this-year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        
        whereClause.date = {
          gte: startOfYear,
          lte: endOfYear,
        };
      }
    }

    if (accountId) {
      whereClause.accountId = accountId;
    }

    const tagIds = searchParams.get('tagIds');
    if (tagIds) {
      const tagIdArray = tagIds.split(',').filter(Boolean);
      if (tagIdArray.length > 0) {
        whereClause.tags = {
          some: {
            id: { in: tagIdArray },
          },
        };
      }
    }

    const total = await db.expenseTransaction.count({
      where: whereClause,
    });

    let effectiveTake = takeNumber;
    if (search && search.trim().length > 0) {
      effectiveTake = 100;
    }

    // Get transactions with optional pagination
    const expenseTransactions = await db.expenseTransaction.findMany({
      where: whereClause,
      include: {
        account: true,
        expenseType: true,
        expenseSubcategory: true,
        tags: true,
      },
      orderBy: {
        date: 'desc',
      },
      ...(skipNumber !== undefined && { skip: skipNumber }),
      ...(effectiveTake !== undefined && { take: effectiveTake }),
    });

    // Calculate hasMore
    const currentCount = (skipNumber || 0) + expenseTransactions.length;
    const hasMore = currentCount < total;

    return NextResponse.json({
      transactions: expenseTransactions,
      total,
      hasMore,
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting expense transactions: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
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

    const parseResult = ServerPostExpenseSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      amount,
      accountId,
      expenseTypeId,
      expenseSubcategoryId,
      date,
      description,
      isInstallment,
      installmentDuration,
      installmentStartDate,
      isSystemGenerated,
      parentInstallmentId,
      tagIds,
    } = parseResult.data;

    if (!isInstallment && !date) {
      return NextResponse.json(
        { error: 'Date is required for regular expenses' },
        { status: 400 }
      );
    }

    if (isInstallment && (!installmentDuration || !installmentStartDate)) {
      return NextResponse.json(
        { error: 'Installment duration and start date are required for installment expenses' },
        { status: 400 }
      )
    }

    // Validate subcategory belongs to expense type if provided
    if (expenseSubcategoryId) {
      const subcategory = await db.expenseSubcategory.findUnique({
        where: {
          id: expenseSubcategoryId,
          userId: session.user.id,
        },
      });

      if (!subcategory) {
        return NextResponse.json(
          { error: 'Subcategory not found' },
          { status: 404 }
        );
      }

      if (subcategory.expenseTypeId !== expenseTypeId) {
        return NextResponse.json(
          { error: 'Subcategory does not belong to the selected expense type' },
          { status: 400 }
        );
      }
    }

    const result = await db.$transaction(async (tx) => {
      const parsedAmount = parseFloat(amount);

      let monthlyAmount: number | null = null;
      let remainingInstallments: number | null = null;

      if (isInstallment && installmentDuration) {
        monthlyAmount = parsedAmount / installmentDuration;
        remainingInstallments = installmentDuration;
      }

      const expenseTransaction = await tx.expenseTransaction.create({
        data: {
          userId: session.user.id,
          name,
          amount: parsedAmount,
          accountId,
          expenseTypeId,
          expenseSubcategoryId: expenseSubcategoryId || null,
          date: isInstallment
            ? new Date(installmentStartDate!)
            : new Date(date!),
          description: description || null,
          isInstallment: isInstallment || false,
          installmentDuration: installmentDuration ?? null,
          remainingInstallments: remainingInstallments,
          installmentStartDate: installmentStartDate ? new Date(installmentStartDate) : null,
          monthlyAmount,
          isSystemGenerated: isSystemGenerated || false,
          parentInstallmentId: parentInstallmentId || null,
          ...(tagIds && tagIds.length > 0 && {
            tags: { connect: tagIds.map((id) => ({ id })) },
          }),
        },
      });

      if (!isSystemGenerated) {
        if (!isInstallment) {
          await tx.financialAccount.update({
            where: {
              id: accountId,
              userId: session.user.id,
            },
            data: {
              currentBalance: {
                decrement: parsedAmount,
              },
            },
          });
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const startDate = new Date(installmentStartDate!);
          startDate.setHours(0, 0, 0, 0);

          if (startDate <= today) {
            await tx.financialAccount.update({
              where: {
                id: accountId,
                userId: session.user.id,
              },
              data: {
                currentBalance: {
                  decrement: monthlyAmount!,
                },
              },
            });

            await tx.expenseTransaction.update({
              where: {
                id: expenseTransaction.id,
              },
              data: {
                lastProcessedDate: startDate,
                remainingInstallments: {
                  decrement: 1,
                }
              },
            });

            await tx.expenseTransaction.create({
              data: {
                userId: session.user.id,
                accountId,
                expenseTypeId,
                expenseSubcategoryId: expenseSubcategoryId || null,
                name: `${name} (Payment 1/${installmentDuration})`,
                amount: monthlyAmount!,
                date: startDate,
                description: `Installment payment 1 of ${installmentDuration}`,
                isInstallment: false,
                isSystemGenerated: true,
                parentInstallmentId: expenseTransaction.id,
                installmentStatus: isInstallment ? INSTALLMENT_STATUS.active : null,
              },
            });
          }
        }
      }

      return expenseTransaction;
    })

    await onExpenseTransactionChange(result.accountId, result.date);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating expense transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}