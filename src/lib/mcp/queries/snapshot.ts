import { db } from "@/lib/prisma";
import { calculateMonthlyChange } from "@/lib/net-worth";
import { phToday } from "@/lib/mcp/dates";
import { round2, toNumber } from "./util";

/**
 * Current net worth, month-to-date change, target and every account balance.
 * Net worth is summed from the same account rows `calculateCurrentNetWorth` aggregates
 * (accounts with addToNetWorth), so the two always agree and the reads stay parallel.
 */
export async function getSnapshot(userId: string) {
  // calculateMonthlyChange only uses its second argument for the percentage, so the net
  // change is fetched in parallel with the accounts and the percentage is derived below.
  const [accounts, user, monthly] = await Promise.all([
    db.financialAccount.findMany({
      where: { userId },
      select: { name: true, accountType: true, currentBalance: true, addToNetWorth: true },
      orderBy: { name: "asc" },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { netWorthTarget: true, netWorthTargetDate: true },
    }),
    calculateMonthlyChange(userId, 0),
  ]);

  const rows = accounts.map((a) => ({
    name: a.name,
    type: a.accountType as string,
    balance: round2(toNumber(a.currentBalance)),
    countsTowardNetWorth: a.addToNetWorth,
  }));

  const netWorth = round2(
    rows.filter((a) => a.countsTowardNetWorth).reduce((sum, a) => sum + a.balance, 0)
  );

  // Totals by type cover the accounts that count toward net worth, so they sum to netWorth.
  const totalsByType: Record<string, number> = {};
  for (const a of rows) {
    if (!a.countsTowardNetWorth) continue;
    totalsByType[a.type] = round2((totalsByType[a.type] ?? 0) + a.balance);
  }

  const previousNetWorth = netWorth - monthly.change;
  const percentage =
    previousNetWorth !== 0 ? round2((monthly.change / Math.abs(previousNetWorth)) * 100) : 0;

  return {
    asOf: phToday().toISOString().slice(0, 10),
    currency: "PHP",
    netWorth,
    monthlyChange: { amount: monthly.change, percentage },
    netWorthTarget: user?.netWorthTarget
      ? {
          target: round2(toNumber(user.netWorthTarget)),
          targetDate: user.netWorthTargetDate
            ? user.netWorthTargetDate.toISOString().slice(0, 10)
            : null,
        }
      : null,
    accounts: rows,
    totalsByType,
  };
}
