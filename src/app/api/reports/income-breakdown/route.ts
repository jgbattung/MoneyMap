import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

interface IncomeBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

interface IncomeBreakdownResponse {
  month: number;
  year: number;
  totalEarned: number;
  data: IncomeBreakdownItem[];
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
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return NextResponse.json(
        { error: "Cannot retrieve income breakdown for future months." },
        { status: 400 }
      );
    }

    // Compute date range for the given month/year
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch all income types for the user
    const incomeTypes = await db.incomeType.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
      },
    });

    // Find the earliest income transaction for this user
    const earliestTransaction = await db.incomeTransaction.findFirst({
      where: { userId },
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
      earliestMonth = earliestDate.getMonth() + 1;
      earliestYear = earliestDate.getFullYear();
    }

    // Use groupBy to let PostgreSQL aggregate earnings per income type
    const earningGroups = await db.incomeTransaction.groupBy({
      by: ['incomeTypeId'],
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    });

    const earningsByType: Record<string, number> = {};
    for (const group of earningGroups) {
      earningsByType[group.incomeTypeId] = parseFloat((group._sum.amount ?? 0).toString());
    }

    // Calculate total earnings
    const totalEarned = Object.values(earningsByType).reduce((sum, amt) => sum + amt, 0);

    // Build response, excluding types with zero earnings
    const data: IncomeBreakdownItem[] = incomeTypes
      .filter((type) => (earningsByType[type.id] ?? 0) > 0)
      .map((type) => {
        const amount = Math.round(earningsByType[type.id] * 100) / 100;
        const percentage = totalEarned > 0
          ? Math.round((amount / totalEarned) * 10000) / 100
          : 0;

        return {
          id: type.id,
          name: type.name,
          amount,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const response: IncomeBreakdownResponse = {
      month,
      year,
      totalEarned: Math.round(totalEarned * 100) / 100,
      data,
      earliestMonth,
      earliestYear,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching income breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch income breakdown" },
      { status: 500 }
    );
  }
}