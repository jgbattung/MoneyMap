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
      categoryIds,
      subcategoryIds,
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

    // Parse category/subcategory IDs from comma-separated strings
    const categoryIdArray = categoryIds
      ? categoryIds.split(",").filter((id) => id.trim().length > 0)
      : [];
    const subcategoryIdArray = subcategoryIds
      ? subcategoryIds.split(",").filter((id) => id.trim().length > 0)
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

    if (categoryIdArray.length > 0) {
      if (isExpense) {
        where.expenseTypeId = { in: categoryIdArray };
      } else {
        where.incomeTypeId = { in: categoryIdArray };
      }
    }

    if (subcategoryIdArray.length > 0 && isExpense) {
      where.expenseSubcategoryId = { in: subcategoryIdArray };
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
          categoryIdArray,
          subcategoryIdArray,
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
    const breakdown = breakdownResult.items.map(
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
      breakdownBy: breakdownResult.breakdownBy,
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
  categoryIdArray: string[],
  subcategoryIdArray: string[],
  userId: string
): Promise<{
  items: { id: string; name: string; amount: number }[];
  breakdownBy: "category" | "subcategory" | null;
}> {
  if (isExpense) {
    // Exactly 1 subcategory selected — a 1-row breakdown is noise
    if (subcategoryIdArray.length === 1) {
      return { items: [], breakdownBy: null };
    }

    // 2+ subcategories selected (any # of categories) — group by subcategory, restricted via where
    // Exactly 1 category and no subcategories — group by subcategory (existing behavior)
    const groupBySubcategory =
      subcategoryIdArray.length >= 2 ||
      (subcategoryIdArray.length === 0 && categoryIdArray.length === 1);

    if (groupBySubcategory) {
      // Group by subcategory
      const groups = await db.expenseTransaction.groupBy({
        by: ["expenseSubcategoryId"],
        where,
        _sum: { amount: true },
      });

      if (groups.length === 0) return { items: [], breakdownBy: "subcategory" };

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

      const items = groups
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
      return { items, breakdownBy: "subcategory" };
    } else {
      // No categories, or 2+ categories with no subcategories — group by expense type, restricted via where
      const groups = await db.expenseTransaction.groupBy({
        by: ["expenseTypeId"],
        where,
        _sum: { amount: true },
      });

      if (groups.length === 0) return { items: [], breakdownBy: "category" };

      const types = await db.expenseType.findMany({
        where: { userId },
        select: { id: true, name: true },
      });
      const typeMap = new Map(types.map((t) => [t.id, t.name]));

      const items = groups
        .map((g) => ({
          id: g.expenseTypeId,
          name: typeMap.get(g.expenseTypeId) ?? "Unknown",
          amount:
            Math.round(parseFloat(g._sum.amount?.toString() ?? "0") * 100) /
            100,
        }))
        .sort((a, b) => b.amount - a.amount);
      return { items, breakdownBy: "category" };
    }
  } else {
    // Income: exactly 1 category selected — a 1-row breakdown is noise
    if (categoryIdArray.length === 1) {
      return { items: [], breakdownBy: null };
    }

    // No categories, or 2+ categories — group by income type, restricted via where
    const groups = await db.incomeTransaction.groupBy({
      by: ["incomeTypeId"],
      where,
      _sum: { amount: true },
    });

    if (groups.length === 0) return { items: [], breakdownBy: "category" };

    const types = await db.incomeType.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const typeMap = new Map(types.map((t) => [t.id, t.name]));

    const items = groups
      .map((g) => ({
        id: g.incomeTypeId,
        name: typeMap.get(g.incomeTypeId) ?? "Unknown",
        amount:
          Math.round(parseFloat(g._sum.amount?.toString() ?? "0") * 100) /
          100,
      }))
      .sort((a, b) => b.amount - a.amount);
    return { items, breakdownBy: "category" };
  }
}
