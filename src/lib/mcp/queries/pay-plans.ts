import { db } from "@/lib/prisma";
import { loadAccountFlows } from "./flows";
import { SAVINGS_ACCOUNT_TYPES } from "./savings";
import { round2, toNumber } from "./util";

/**
 * The latest pay divisions (newest first) and how much of each plan actually happened.
 * - A TRANSFER item is done when its transfer is recorded (`transferTransactionId`); the
 *   recorded transfer's amount is what counts. `completedAt` is only set on EARMARK rows.
 * - `actualIntoSaveAccounts` is the net inflow (income + transfers in - expenses - transfers
 *   out) of the division's TRANSFER target accounts that are SAVINGS / INVESTMENT / RETIREMENT,
 *   from this division's pay date up to the next (newer) division's pay date, or now.
 */
export async function getPayPlanAdherence(userId: string, args: { limit?: number }) {
  const limit = Math.min(Math.max(args.limit ?? 6, 1), 20);

  const divisions = await db.payDivision.findMany({
    where: { userId },
    orderBy: [{ payDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          kind: true,
          amount: true,
          completedAt: true,
          transferTransactionId: true,
          transferTransaction: { select: { amount: true } },
          toAccountId: true,
          toAccount: { select: { accountType: true } },
        },
      },
    },
  });

  if (divisions.length === 0) return { currency: "PHP", divisions: [] };

  const oldest = divisions[divisions.length - 1].payDate;
  const flows = await loadAccountFlows(
    userId,
    { accountType: { in: [...SAVINGS_ACCOUNT_TYPES] } },
    { gte: oldest }
  );

  const result = divisions.map((d, i) => {
    // List is newest first, so the next (newer) division is the previous element.
    const windowEnd = i > 0 ? divisions[i - 1].payDate : null;
    const transfers = d.items.filter((it) => it.kind === "TRANSFER");
    const earmarks = d.items.filter((it) => it.kind === "EARMARK");

    const targetIds = new Set(
      transfers
        .filter(
          (it) =>
            it.toAccountId &&
            it.toAccount &&
            (SAVINGS_ACCOUNT_TYPES as readonly string[]).includes(it.toAccount.accountType)
        )
        .map((it) => it.toAccountId as string)
    );

    const actualIntoSaveAccounts = flows
      .filter(
        (f) =>
          targetIds.has(f.accountId) &&
          f.date >= d.payDate &&
          (windowEnd === null || f.date < windowEnd)
      )
      .reduce((s, f) => s + f.inflow - f.outflow, 0);

    return {
      payDate: d.payDate.toISOString().slice(0, 10),
      planName: d.planName,
      payAmount: round2(toNumber(d.payAmount)),
      savePercent: round2(toNumber(d.savePercent)),
      plannedSave: round2(toNumber(d.saveAmount)),
      plannedTransfers: round2(transfers.reduce((s, it) => s + toNumber(it.amount), 0)),
      completedTransfers: round2(
        transfers
          .filter((it) => it.transferTransactionId)
          .reduce((s, it) => s + (it.transferTransaction?.amount ?? toNumber(it.amount)), 0)
      ),
      pendingTransfers: transfers.filter((it) => !it.transferTransactionId).length,
      pendingEarmarks: earmarks.filter((it) => !it.completedAt).length,
      actualIntoSaveAccounts: round2(actualIntoSaveAccounts),
      windowEnd: windowEnd ? windowEnd.toISOString().slice(0, 10) : null,
    };
  });

  return { currency: "PHP", divisions: result };
}
