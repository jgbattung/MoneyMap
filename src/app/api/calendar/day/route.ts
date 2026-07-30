import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { calendarDayQuerySchema } from "@/lib/validations/calendar";
import { CalendarDayResponse, CalendarDayTransaction } from "@/types/calendar";

export const dynamic = "force-dynamic";

const DAY_TAKE = 100;

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

    const parsed = calendarDayQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { date } = parsed.data;

    const gte = new Date(date);
    const lte = new Date(date);
    lte.setUTCHours(23, 59, 59, 999);
    const dateWhere = { gte, lte };

    const [expenseRows, incomeRows, transferRows] = await Promise.all([
      db.expenseTransaction.findMany({
        where: { userId, date: dateWhere, isInstallment: false },
        take: DAY_TAKE,
        include: {
          account: { select: { name: true } },
          expenseType: { select: { name: true } },
          expenseSubcategory: { select: { name: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
      }),
      db.incomeTransaction.findMany({
        where: { userId, date: dateWhere },
        take: DAY_TAKE,
        include: {
          account: { select: { name: true } },
          incomeType: { select: { name: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
      }),
      db.transferTransaction.findMany({
        where: { userId, date: dateWhere },
        take: DAY_TAKE,
        include: {
          fromAccount: { select: { name: true } },
          toAccount: { select: { name: true } },
          transferType: { select: { name: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
      }),
    ]);

    const mappedExpenses: CalendarDayTransaction[] = expenseRows.map((t) => ({
      id: t.id,
      name: t.name,
      amount: round2(Math.abs(parseFloat(String(t.amount)))),
      type: "EXPENSE",
      date: t.date.toISOString(),
      categoryName: t.expenseType.name,
      subcategoryName: t.expenseSubcategory?.name,
      accountName: t.account.name,
      tags: t.tags,
    }));

    const mappedIncome: CalendarDayTransaction[] = incomeRows.map((t) => ({
      id: t.id,
      name: t.name,
      amount: round2(Math.abs(parseFloat(String(t.amount)))),
      type: "INCOME",
      date: t.date.toISOString(),
      categoryName: t.incomeType.name,
      accountName: t.account.name,
      tags: t.tags,
    }));

    const mappedTransfers: CalendarDayTransaction[] = transferRows.map((t) => ({
      id: t.id,
      name: t.name,
      amount: round2(Math.abs(parseFloat(String(t.amount)))),
      type: "TRANSFER",
      date: t.date.toISOString(),
      categoryName: t.transferType.name,
      accountName: t.fromAccount.name,
      toAccountName: t.toAccount.name,
      tags: t.tags,
    }));

    const transactions = [...mappedExpenses, ...mappedIncome, ...mappedTransfers].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const expenseTotal = mappedExpenses.reduce((sum, t) => sum + t.amount, 0);
    const incomeTotal = mappedIncome.reduce((sum, t) => sum + t.amount, 0);

    const response: CalendarDayResponse = {
      transactions,
      totals: {
        income: round2(incomeTotal),
        expense: round2(expenseTotal),
        net: round2(incomeTotal - expenseTotal),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching calendar day:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar day" },
      { status: 500 }
    );
  }
}
