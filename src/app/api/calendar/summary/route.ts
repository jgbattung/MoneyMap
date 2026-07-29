import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { calendarSummaryQuerySchema } from "@/lib/validations/calendar";
import { mergeDayBuckets } from "@/lib/calendar-buckets";
import { CalendarDayBucket, CalendarSummaryResponse } from "@/types/calendar";

export const dynamic = "force-dynamic";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    const rawParams: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = calendarSummaryQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { start, end } = parsed.data;

    const gte = new Date(start);
    const lte = new Date(end);
    lte.setUTCHours(23, 59, 59, 999);

    const dateWhere = { gte, lte };

    const [expenseRows, incomeRows, transferRows] = await Promise.all([
      db.expenseTransaction.groupBy({
        by: ["date"],
        where: { userId, date: dateWhere, isInstallment: false },
        _sum: { amount: true },
        _count: true,
      }),
      db.incomeTransaction.groupBy({
        by: ["date"],
        where: { userId, date: dateWhere },
        _sum: { amount: true },
        _count: true,
      }),
      db.transferTransaction.groupBy({
        by: ["date"],
        where: { userId, date: dateWhere },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    let map = new Map<string, CalendarDayBucket>();
    map = mergeDayBuckets(expenseRows, "expense", map);
    map = mergeDayBuckets(incomeRows, "income", map);
    map = mergeDayBuckets(transferRows, "transfer", map);

    const days: CalendarDayBucket[] = Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((bucket) => ({
        ...bucket,
        expense: round2(bucket.expense),
        income: round2(bucket.income),
        transfer: round2(bucket.transfer),
      }));

    const totals = days.reduce(
      (acc, day) => {
        acc.expense += day.expense;
        acc.income += day.income;
        return acc;
      },
      { expense: 0, income: 0 }
    );

    const max = days.reduce(
      (acc, day) => ({
        expense: Math.max(acc.expense, day.expense),
        income: Math.max(acc.income, day.income),
      }),
      { expense: 0, income: 0 }
    );

    const response: CalendarSummaryResponse = {
      days,
      totals: {
        expense: round2(totals.expense),
        income: round2(totals.income),
        net: round2(totals.income - totals.expense),
      },
      max,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching calendar summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar summary" },
      { status: 500 }
    );
  }
}
