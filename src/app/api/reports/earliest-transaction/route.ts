import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

interface EarliestTransactionResponse {
  earliestMonth: number | null;
  earliestYear: number | null;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Find earliest expense transaction (non-installment)
    const earliestExpense = await db.expenseTransaction.findFirst({
      where: {
        userId,
        isInstallment: false,
      },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    // Find earliest income transaction
    const earliestIncome = await db.incomeTransaction.findFirst({
      where: { userId },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    // Determine the overall earliest date
    let earliestDate: Date | null = null;

    if (earliestExpense && earliestIncome) {
      earliestDate = earliestExpense.date < earliestIncome.date
        ? earliestExpense.date
        : earliestIncome.date;
    } else if (earliestExpense) {
      earliestDate = earliestExpense.date;
    } else if (earliestIncome) {
      earliestDate = earliestIncome.date;
    }

    let earliestMonth: number | null = null;
    let earliestYear: number | null = null;

    if (earliestDate) {
      const date = new Date(earliestDate);
      earliestMonth = date.getMonth() + 1;
      earliestYear = date.getFullYear();
    }

    const response: EarliestTransactionResponse = {
      earliestMonth,
      earliestYear,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching earliest transaction date:", error);
    return NextResponse.json(
      { error: "Failed to fetch earliest transaction date" },
      { status: 500 }
    );
  }
}