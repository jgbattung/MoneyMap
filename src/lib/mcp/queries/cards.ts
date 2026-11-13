import { db } from "@/lib/prisma";
import { addMonths, daysInMonth, monthKey, phToday } from "@/lib/mcp/dates";
import { round2, toNumber } from "./util";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Next occurrence of `dueDay` on or after PH today, clamped to the month's last day. */
function nextDue(dueDay: number) {
  const today = phToday();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  const candidateIn = (month: string) => {
    const day = Math.min(dueDay, daysInMonth(month));
    return Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, day);
  };

  const thisMonth = monthKey(today);
  let due = candidateIn(thisMonth);
  if (due < todayUtc) due = candidateIn(addMonths(thisMonth, 1));

  return {
    nextDueDate: new Date(due).toISOString().slice(0, 10),
    daysUntilDue: Math.round((due - todayUtc) / DAY_MS),
  };
}

/**
 * Credit cards with balances and the next payment due date (PH time).
 * Sign convention (same as /api/cards): `balance` is the account's currentBalance, so it is
 * NEGATIVE when money is owed and positive for an overpayment credit. `owed` restates it as a
 * positive amount. `statementBalance` / `previousStatementBalance` are positive amounts billed.
 */
export async function getCreditCards(userId: string) {
  const cards = await db.financialAccount.findMany({
    where: { userId, accountType: "CREDIT_CARD" },
    select: {
      name: true,
      cardGroup: true,
      currentBalance: true,
      statementBalance: true,
      previousStatementBalance: true,
      statementDate: true,
      dueDate: true,
    },
    orderBy: { currentBalance: "asc" },
  });

  const rows = cards.map((c) => {
    const balance = round2(toNumber(c.currentBalance));
    return {
      name: c.name,
      cardGroup: c.cardGroup,
      balance,
      owed: round2(Math.max(0, -balance)),
      statementBalance: c.statementBalance == null ? null : round2(toNumber(c.statementBalance)),
      previousStatementBalance:
        c.previousStatementBalance == null ? null : round2(toNumber(c.previousStatementBalance)),
      statementDay: c.statementDate,
      dueDay: c.dueDate,
      ...(c.dueDate ? nextDue(c.dueDate) : { nextDueDate: null, daysUntilDue: null }),
    };
  });

  return {
    currency: "PHP",
    totalOwed: round2(rows.reduce((s, r) => s + r.owed, 0)),
    cards: rows,
  };
}
