import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET() {
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

    const expenseTransactions = await db.expenseTransaction.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        account: true,
        expenseType: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(expenseTransactions, { status: 200 });
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
      date, 
      description,
      isInstallment,
      installmentDuration,
      installmentStartDate
    } = body;

    if (!name || !amount || !accountId || !expenseTypeId) {
      return NextResponse.json(
        { error: 'Missing required fileds: name, amount, accountId, expenseTypeId, date' }
      )
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
          date: isInstallment
            ? new Date(installmentStartDate)
            : new Date(date),
          description: description || null,
          isInstallment: isInstallment || false,
          installmentDuration: installmentDuration ? parseInt(installmentDuration) : null,
          remainingInstallments: remainingInstallments,
          installmentStartDate: installmentStartDate ? new Date(installmentStartDate) : null,
          monthlyAmount,
        },
      });

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
        }
      }

      return expenseTransaction;
    })

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating income transaction: ', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}