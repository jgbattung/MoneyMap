import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
    const skip = searchParams.get('skip');
    const take = searchParams.get('take');
    const search = searchParams.get('search');
    const dateFilter = searchParams.get('dateFilter');
    const accountId = searchParams.get('accountId');

    const skipNumber = skip ? Math.min(parseInt(skip), 10000) : undefined;
    const takeNumber = take ? Math.min(parseInt(take), 100) : undefined;

    const whereClause: Prisma.IncomeTransactionWhereInput = {
      userId: session.user.id,
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
          incomeType: {
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

    const total = await db.incomeTransaction.count({
      where: whereClause,
    });

    // Determine limit - if searching, return more results (up to 100)
    let effectiveTake = takeNumber;
    if (search && search.trim().length > 0) {
      effectiveTake = 100;
    }

    const incomeTransactions = await db.incomeTransaction.findMany({
      where: whereClause,
      include: {
        account: true,
        incomeType: true,
        tags: true,
      },
      orderBy: {
        date: 'desc',
      },
      ...(skipNumber !== undefined && { skip: skipNumber }),
      ...(effectiveTake !== undefined && { take: effectiveTake }),
    });

    // Calculate hasMore
    const currentCount = (skipNumber || 0) + incomeTransactions.length;
    const hasMore = currentCount < total;

    return NextResponse.json({
      transactions: incomeTransactions,
      total,
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

    const result = await db.$transaction(async (tx) => {
      const incomeTransaction = await tx.incomeTransaction.create({
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
      });

      await tx.financialAccount.update({
        where: {
          id: accountId,
          userId: session.user.id,
        },
        data: {
          currentBalance: {
            increment: parseFloat(amount),
          },
        },
      });

      return incomeTransaction;
    });

    await onIncomeTransactionChange(accountId, new Date(date));

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating income transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}