import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeFirstLetter(str: string) {
  if (str.length === 0) {
    return ""; // Handle empty strings
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getOrdinalSuffix (day: number) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

interface Account {
  accountType: string;
  currentBalance: number | string;
  addToNetWorth: boolean;
}

interface AssetCategory {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

// Color mapping for each account type
// Color mapping for each account type
const CATEGORY_COLORS: Record<string, string> = {
  CHECKING: "var(--chart-1)",      // Teal
  SAVINGS: "var(--chart-2)",       // Gold
  INVESTMENT: "var(--chart-3)",    // Green
  CASH: "var(--chart-4)",          // Red
  CRYPTO: "var(--chart-5)",        // Slate
  RETIREMENT: "var(--chart-6)",    // Purple
  REAL_ESTATE: "var(--chart-7)",   // Orange
  PAYROLL: "var(--chart-9)",       // Cyan
  E_WALLET: "var(--chart-10)",     // Mint Green
  OTHER: "var(--chart-8)",         // Blue
};

// Format account type names
// Format account type names
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

export function calculateAssetCategories(accounts: Account[]): AssetCategory[] {
  // Filter: only accounts that contribute to net worth AND are not credit cards
  const assetAccounts = accounts.filter(
    (account) => 
      account.addToNetWorth && 
      account.accountType !== "CREDIT_CARD"
  );

  if (assetAccounts.length === 0) {
    return [];
  }

  // Group by account type and sum balances
  const categoryMap = new Map<string, number>();

  for (const account of assetAccounts) {
    const currentBalance = typeof account.currentBalance === 'string'
      ? parseFloat(account.currentBalance)
      : account.currentBalance;

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
      color: CATEGORY_COLORS[type] || "var(--chart-1)",
    }))
    .filter(cat => cat.value > 0) // Only include categories with positive balance
    .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending

  return categories;
}

export const formatDateForAPI = (date: Date | null | undefined): string | undefined => {
  if (!date) return undefined;
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
};