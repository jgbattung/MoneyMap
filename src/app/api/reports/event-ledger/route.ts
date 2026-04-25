import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { eventLedgerQuerySchema } from "@/lib/validations/event-ledger";
import { EventLedgerResponse, EventLedgerTransaction } from "@/types/event-ledger";

export const dynamic = "force-dynamic";

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

    const parsed = eventLedgerQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { tagIds, startDate, endDate, accountId, skip, take } = parsed.data;

    const tagIdArray = tagIds.split(",").filter((id) => id.trim().length > 0);
    if (tagIdArray.length === 0) {
      return NextResponse.json(
        { error: "At least one tag is required" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharedWhere: any = {
      userId,
      tags: { some: { id: { in: tagIdArray } } },
    };

    if (startDate) {
      sharedWhere.date = { ...sharedWhere.date, gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      sharedWhere.date = { ...sharedWhere.date, lte: end };
    }
    if (accountId) {
      sharedWhere.accountId = accountId;
    }

    const expenseWhere = { ...sharedWhere, isInstallment: false };

    const [expenseAgg, incomeAgg, expenseRows, incomeRows] = await Promise.all([
      db.expenseTransaction.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
        _count: true,
      }),
      db.incomeTransaction.aggregate({
        where: sharedWhere,
        _sum: { amount: true },
        _count: true,
      }),
      db.expenseTransaction.findMany({
        where: expenseWhere,
        orderBy: { date: "desc" },
        take: skip + take + 1,
        include: {
          account: { select: { name: true } },
          expenseType: { select: { name: true } },
          expenseSubcategory: { select: { name: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
      }),
      db.incomeTransaction.findMany({
        where: sharedWhere,
        orderBy: { date: "desc" },
        take: skip + take + 1,
        include: {
          account: { select: { name: true } },
          incomeType: { select: { name: true } },
          tags: { select: { id: true, name: true, color: true } },
        },
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedExpenses: EventLedgerTransaction[] = expenseRows.map((t: any) => ({
      id: t.id,
      name: t.name,
      amount: Math.abs(parseFloat(t.amount.toString())),
      type: "expense" as const,
      date: t.date.toISOString(),
      categoryName: t.expenseType.name,
      subcategoryName: t.expenseSubcategory?.name,
      accountName: t.account.name,
      tags: t.tags,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedIncome: EventLedgerTransaction[] = incomeRows.map((t: any) => ({
      id: t.id,
      name: t.name,
      amount: Math.abs(parseFloat(t.amount.toString())),
      type: "income" as const,
      date: t.date.toISOString(),
      categoryName: t.incomeType.name,
      accountName: t.account.name,
      tags: t.tags,
    }));

    const merged = [...mappedExpenses, ...mappedIncome].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const hasMore = merged.length > skip + take;
    const transactions = merged.slice(skip, skip + take);

    const totalExpenses =
      Math.round(
        parseFloat(expenseAgg._sum.amount?.toString() ?? "0") * 100
      ) / 100;
    const totalIncome =
      Math.round(
        parseFloat(incomeAgg._sum.amount?.toString() ?? "0") * 100
      ) / 100;

    const response: EventLedgerResponse = {
      totalExpenses,
      totalIncome,
      netAmount: Math.round((totalExpenses - totalIncome) * 100) / 100,
      expenseCount: expenseAgg._count,
      incomeCount: incomeAgg._count,
      transactions,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching event ledger:", error);
    return NextResponse.json(
      { error: "Failed to fetch event ledger" },
      { status: 500 }
    );
  }
}
