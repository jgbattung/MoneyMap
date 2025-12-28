import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

interface BudgetStatusItem {
  id: string;
  name: string;
  monthlyBudget: number | null;
  spentAmount: number;
  progressPercentage: number;
  isOverBudget: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const expenseTypes = await db.expenseType.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        monthlyBudget: true,
      },
    });

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

    // Group transactions by expense type and calculate total spending
    const spendingByType: Record<string, number> = {};
    
    for (const transaction of expenseTransactions) {
      const typeId = transaction.expenseTypeId;
      const amount = parseFloat(transaction.amount.toString());
      
      if (!spendingByType[typeId]) {
        spendingByType[typeId] = 0;
      }
      
      spendingByType[typeId] += amount;
    }

    // Combine expense types with spending data and calculate percentages
    const budgetStatus: BudgetStatusItem[] = expenseTypes.map(type => {
      const spentAmount = spendingByType[type.id] || 0;
      const monthlyBudget = type.monthlyBudget 
        ? parseFloat(type.monthlyBudget.toString()) 
        : null;
      
      const progressPercentage = monthlyBudget && monthlyBudget > 0
        ? (spentAmount / monthlyBudget) * 100
        : 0;
      
      const isOverBudget = monthlyBudget 
        ? spentAmount > monthlyBudget
        : false;

      return {
        id: type.id,
        name: type.name,
        monthlyBudget,
        spentAmount: Math.round(spentAmount * 100) / 100,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        isOverBudget,
      };
    });

    const top5Budgets = budgetStatus
      .sort((a, b) => b.spentAmount - a.spentAmount)
      .slice(0, 5);

    return NextResponse.json({
      budgets: top5Budgets
    });

  } catch (error) {
    console.error("Error fetching budget status:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget status" },
      { status: 500 }
    );
  }
}