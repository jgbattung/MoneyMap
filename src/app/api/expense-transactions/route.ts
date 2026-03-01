import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { INSTALLMENT_STATUS } from "./[id]/route";
import { Prisma } from "@prisma/client";
import { onExpenseTransactionChange } from "@/lib/statement-recalculator";

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

    const skipNumber = skip ? parseInt(skip) : undefined;
    const takeNumber = take ? parseInt(take) : undefined;

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
    } = body;

    console.log('📅 Received date from client:', date);
    console.log('📅 After new Date:', new Date(date));

    if (!name || !amount || !accountId || !expenseTypeId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, amount, accountId, expenseTypeId' },
        { status: 400 }
      );
    }

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
        monthlyAmount = parsedAmount / parseInt(installmentDuration);
        remainingInstallments = parseInt(installmentDuration);
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
            ? new Date(installmentStartDate)
            : new Date(date),
          description: description || null,
          isInstallment: isInstallment || false,
          installmentDuration: installmentDuration ? parseInt(installmentDuration) : null,
          remainingInstallments: remainingInstallments,
          installmentStartDate: installmentStartDate ? new Date(installmentStartDate) : null,
          monthlyAmount,
          isSystemGenerated: isSystemGenerated || false,
          parentInstallmentId: parentInstallmentId || null,
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

          const startDate = new Date(installmentStartDate);
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