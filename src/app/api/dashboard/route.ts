import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/prisma";

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

    // Get all accounts that contribute to net worth (excluding credit cards for assets breakdown)
    const accounts = await db.financialAccount.findMany({
      where: {
        userId,
        addToNetWorth: true,
        accountType: {
          not: "CREDIT_CARD"
        }
      },
      select: {
        accountType: true,
        currentBalance: true,
      }
    });

    if (accounts.length === 0) {
      return NextResponse.json({ categories: [] });
    }

    // Group by account type and sum balances
    const categoryMap = new Map<string, number>();

    for (const account of accounts) {
      const currentBalance = parseFloat(account.currentBalance.toString());
      const currentTotal = categoryMap.get(account.accountType) || 0;
      categoryMap.set(account.accountType, currentTotal + currentBalance);
    }

    // Calculate total for percentages
    const totalBalance = Array.from(categoryMap.values()).reduce(
      (sum, balance) => sum + balance,
      0
    );

    // Convert to array and calculate percentages
    const categories = Array.from(categoryMap.entries())
      .map(([type, balance]) => ({
        name: formatAccountType(type),
        value: Math.round(balance * 100) / 100,
        percentage: totalBalance > 0 
          ? Math.round((balance / totalBalance) * 100 * 10) / 10 // One decimal place
          : 0,
      }))
      .filter(cat => cat.value > 0) // Only include categories with positive balance
      .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

    return NextResponse.json({ categories });

  } catch (error) {
    console.error("Error fetching asset categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch asset categories" },
      { status: 500 }
    );
  }
}

// Helper function to format account type names
function formatAccountType(type: string): string {
  const typeMap: Record<string, string> = {
    CHECKING: "Checking",
    SAVINGS: "Savings",
    INVESTMENT: "Investment",
    CASH: "Cash",
    CRYPTO: "Crypto",
    RETIREMENT: "Retirement",
    REAL_ESTATE: "Real Estate",
    PAYROLL: "Payroll",
    E_WALLET: "E-Wallet",
    OTHER: "Other",
  };

  return typeMap[type] || type;
}