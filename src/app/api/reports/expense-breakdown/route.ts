import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

interface ExpenseBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

interface ExpenseBreakdownResponse {
  month: number;
  year: number;
  totalSpent: number;
  data: ExpenseBreakdownItem[];
  earliestMonth: number | null;
  earliestYear: number | null;
}

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    // Validate params exist
    if (!monthParam || !yearParam) {
      return NextResponse.json(
        { error: "Missing required query parameters: month and year" },
        { status: 400 }
      );
    }

    const month = parseInt(monthParam, 10);
    const year = parseInt(yearParam, 10);

    // Validate month and year values
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 1000 || year > 9999) {
      return NextResponse.json(
        { error: "Invalid month or year. Month must be 1–12, year must be a 4-digit number." },
        { status: 400 }
      );
    }

    // Reject future months
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
    const currentYear = now.getFullYear();

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return NextResponse.json(
        { error: "Cannot retrieve expense breakdown for future months." },
        { status: 400 }
      );
    }

    // Compute date range for the given month/year
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all expense types for the user
    const expenseTypes = await db.expenseType.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
      },
    });

    // Find the earliest expense transaction for this user
    const earliestTransaction = await db.expenseTransaction.findFirst({
      where: {
        userId,
        isInstallment: false,
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        date: true,
      },
    });

    // Extract earliest month/year
    let earliestMonth: number | null = null;
    let earliestYear: number | null = null;

    if (earliestTransaction) {
      const earliestDate = new Date(earliestTransaction.date);
      earliestMonth = earliestDate.getMonth() + 1; // 1-indexed
      earliestYear = earliestDate.getFullYear();
    }

    // Fetch all non-installment expense transactions within the date range
    const expenseTransactions = await db.expenseTransaction.findMany({
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        isInstallment: false,
      },
      select: {
        expenseTypeId: true,
        amount: true,
      },
    });

    // Group and sum amounts by expenseTypeId
    const spendingByType: Record<string, number> = {};

    for (const transaction of expenseTransactions) {
      const typeId = transaction.expenseTypeId;
      const amount = parseFloat(transaction.amount.toString());

      if (!spendingByType[typeId]) {
        spendingByType[typeId] = 0;
      }

      spendingByType[typeId] += amount;
    }

    // Calculate total spending
    const totalSpent = Object.values(spendingByType).reduce((sum, amt) => sum + amt, 0);

    // Build response, excluding types with zero spending
    const data: ExpenseBreakdownItem[] = expenseTypes
      .filter((type) => (spendingByType[type.id] ?? 0) > 0)
      .map((type) => {
        const amount = Math.round(spendingByType[type.id] * 100) / 100;
        const percentage = totalSpent > 0
          ? Math.round((amount / totalSpent) * 10000) / 100
          : 0;

        return {
          id: type.id,
          name: type.name,
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const response: ExpenseBreakdownResponse = {
      month,
      year,
      totalSpent: Math.round(totalSpent * 100) / 100,
      data,
      earliestMonth,
      earliestYear,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching expense breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense breakdown" },
      { status: 500 }
    );
  }
}