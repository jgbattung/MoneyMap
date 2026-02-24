import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

interface MonthlyAggregate {
  year: number;
  month: number;
  total: number;
}

interface AnnualSummaryMonth {
  month: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
}

interface AnnualSummaryYear {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  months: AnnualSummaryMonth[];
}

interface AnnualSummaryResponse {
  years: AnnualSummaryYear[];
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

    const [incomeRows, expenseRows] = await Promise.all([
      db.$queryRaw<MonthlyAggregate[]>`
        SELECT 
          EXTRACT(YEAR FROM date)::int as year,
          EXTRACT(MONTH FROM date)::int as month,
          SUM(amount)::float as total
        FROM income_transactions
        WHERE user_id = ${userId}
        GROUP BY year, month
        ORDER BY year DESC, month ASC
      `,
      db.$queryRaw<MonthlyAggregate[]>`
        SELECT 
          EXTRACT(YEAR FROM date)::int as year,
          EXTRACT(MONTH FROM date)::int as month,
          SUM(amount)::float as total
        FROM expense_transactions
        WHERE user_id = ${userId} AND is_installment = false
        GROUP BY year, month
        ORDER BY year DESC, month ASC
      `,
    ]);

    // Build a map keyed by "year-month"
    const monthMap = new Map<string, { income: number; expenses: number }>();

    for (const row of incomeRows) {
      const key = `${row.year}-${row.month}`;
      const existing = monthMap.get(key) || { income: 0, expenses: 0 };
      existing.income = row.total;
      monthMap.set(key, existing);
    }

    for (const row of expenseRows) {
      const key = `${row.year}-${row.month}`;
      const existing = monthMap.get(key) || { income: 0, expenses: 0 };
      existing.expenses = row.total;
      monthMap.set(key, existing);
    }

    // Filter out future months
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Group by year
    const yearMap = new Map<number, AnnualSummaryMonth[]>();

    for (const [key, data] of monthMap) {
      const [yearStr, monthStr] = key.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      // Skip future months
      if (year > currentYear || (year === currentYear && month > currentMonth)) {
        continue;
      }

      const totalIncome = Math.round(data.income * 100) / 100;
      const totalExpenses = Math.round(data.expenses * 100) / 100;
      const totalSavings = Math.round((data.income - data.expenses) * 100) / 100;

      const months = yearMap.get(year) || [];
      months.push({ month, totalIncome, totalExpenses, totalSavings });
      yearMap.set(year, months);
    }

    // Build final response
    const years: AnnualSummaryYear[] = [];

    for (const [year, months] of yearMap) {
      // Sort months ascending
      months.sort((a, b) => a.month - b.month);

      const totalIncome = Math.round(months.reduce((sum, m) => sum + m.totalIncome, 0) * 100) / 100;
      const totalExpenses = Math.round(months.reduce((sum, m) => sum + m.totalExpenses, 0) * 100) / 100;
      const totalSavings = Math.round((totalIncome - totalExpenses) * 100) / 100;

      years.push({ year, totalIncome, totalExpenses, totalSavings, months });
    }

    // Sort years descending
    years.sort((a, b) => b.year - a.year);

    const response: AnnualSummaryResponse = { years };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching annual summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch annual summary" },
      { status: 500 }
    );
  }
}