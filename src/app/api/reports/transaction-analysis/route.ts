import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";
import { transactionAnalysisQuerySchema } from "@/lib/validations/transaction-analysis";
import { TransactionAnalysisResponse } from "@/types/transaction-analysis";

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

    // Parse query params
    const rawParams: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawParams[key] = value;
    }

    const parsed = transactionAnalysisQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      type,
      startDate,
      endDate,
      categoryId,
      subcategoryId,
      tagIds,
      accountId,
      search,
      skip,
      take,
    } = parsed.data;

    const isExpense = type === "expense";

    // Parse tag IDs from comma-separated string
    const tagIdArray = tagIds
      ? tagIds.split(",").filter((id) => id.trim().length > 0)
      : [];

    // Build dynamic where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };

    if (isExpense) {
      where.isInstallment = false;
    }

    if (startDate) {
      where.date = { ...where.date, gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { ...where.date, lte: end };
    }

    if (categoryId) {
      if (isExpense) {
        where.expenseTypeId = categoryId;
      } else {
        where.incomeTypeId = categoryId;
      }
    }

    if (subcategoryId && isExpense) {
      where.expenseSubcategoryId = subcategoryId;
    }

    if (accountId) {
      where.accountId = accountId;
    }

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (tagIdArray.length > 0) {
      where.tags = { some: { id: { in: tagIdArray } } };
    }

    const model = isExpense ? db.expenseTransaction : db.incomeTransaction;

    // Run aggregate, breakdown, and transaction list queries in parallel
    const [aggregateResult, breakdownResult, transactionResults] =
      await Promise.all([
        // 1. Aggregate: total + count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (model as any).aggregate({
          where,
          _sum: { amount: true },
          _count: true,
        }),

        // 2. Breakdown
        getBreakdown(
          isExpense,
          where,
          categoryId,
          subcategoryId,
          userId
        ),

        // 3. Transaction list
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (model as any).findMany({
          where,
          skip,
          take: take + 1,
          orderBy: { date: "desc" as const },
          include: {
            account: { select: { name: true } },
            ...(isExpense
              ? {
                  expenseType: { select: { name: true } },
                  expenseSubcategory: { select: { name: true } },
                }
              : {
                  incomeType: { select: { name: true } },
                }),
          },
        }),
      ]);

    const totalAmount =
      Math.round(
        parseFloat(aggregateResult._sum.amount?.toString() ?? "0") * 100
      ) / 100;
    const transactionCount = aggregateResult._count;

    // Calculate breakdown percentages
    const breakdown = breakdownResult.map(
      (item: { id: string; name: string; amount: number }) => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        percentage:
          totalAmount > 0
            ? Math.round((item.amount / totalAmount) * 10000) / 100
            : 0,
      })
    );

    // Process transactions
    const hasMore = transactionResults.length > take;
    const sliced = transactionResults.slice(0, take);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = sliced.map((t: any) => ({
      id: t.id,
      name: t.name,
      amount: Math.abs(parseFloat(t.amount.toString())),
      date: t.date.toISOString(),
      categoryName: isExpense ? t.expenseType.name : t.incomeType.name,
      subcategoryName: isExpense ? t.expenseSubcategory?.name : undefined,
      accountName: t.account.name,
    }));

    const response: TransactionAnalysisResponse = {
      type,
      totalAmount,
      transactionCount,
      breakdown,
      transactions,
      hasMore,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching transaction analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction analysis" },
      { status: 500 }
    );
  }
}

async function getBreakdown(
  isExpense: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any,
  categoryId: string | undefined,
  subcategoryId: string | undefined,
  userId: string
): Promise<{ id: string; name: string; amount: number }[]> {
  // If subcategory is selected, or income with category — no breakdown
  if (subcategoryId) return [];
  if (!isExpense && categoryId) return [];

  if (isExpense) {
    if (!categoryId) {
      // Group by expense type
      const groups = await db.expenseTransaction.groupBy({
        by: ["expenseTypeId"],
        where,
        _sum: { amount: true },
      });

      if (groups.length === 0) return [];

      const types = await db.expenseType.findMany({
        where: { userId },
        select: { id: true, name: true },
      });
      const typeMap = new Map(types.map((t) => [t.id, t.name]));

      return groups
        .map((g) => ({
          id: g.expenseTypeId,
          name: typeMap.get(g.expenseTypeId) ?? "Unknown",
          amount:
            Math.round(parseFloat(g._sum.amount?.toString() ?? "0") * 100) /
            100,
        }))
        .sort((a, b) => b.amount - a.amount);
    } else {
      // Group by subcategory
      const groups = await db.expenseTransaction.groupBy({
        by: ["expenseSubcategoryId"],
        where,
        _sum: { amount: true },
      });

      if (groups.length === 0) return [];

      const subcategoryIds = groups
        .map((g) => g.expenseSubcategoryId)
        .filter((id): id is string => id !== null);

      const subcategories =
        subcategoryIds.length > 0
          ? await db.expenseSubcategory.findMany({
              where: { id: { in: subcategoryIds } },
              select: { id: true, name: true },
            })
          : [];
      const subMap = new Map(subcategories.map((s) => [s.id, s.name]));

      return groups
        .map((g) => ({
          id: g.expenseSubcategoryId ?? "uncategorized",
          name: g.expenseSubcategoryId
            ? subMap.get(g.expenseSubcategoryId) ?? "Unknown"
            : "Uncategorized",
          amount:
            Math.round(parseFloat(g._sum.amount?.toString() ?? "0") * 100) /
            100,
        }))
        .sort((a, b) => b.amount - a.amount);
    }
  } else {
    // Income: group by income type
    const groups = await db.incomeTransaction.groupBy({
      by: ["incomeTypeId"],
      where,
      _sum: { amount: true },
    });

    if (groups.length === 0) return [];

    const types = await db.incomeType.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const typeMap = new Map(types.map((t) => [t.id, t.name]));

    return groups
      .map((g) => ({
        id: g.incomeTypeId,
        name: typeMap.get(g.incomeTypeId) ?? "Unknown",
        amount:
          Math.round(parseFloat(g._sum.amount?.toString() ?? "0") * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }
}
