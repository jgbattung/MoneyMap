import type { Prisma } from "@prisma/client";
import { buildDateRange } from "@/lib/report-date-range";

interface LedgerWhereArgs {
  userId: string;
  tagIds?: string[];
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

/**
 * Single source of truth for which transactions an Event Ledger query covers.
 * Used by both the GET preview and the "Tag all" PATCH, so the previewed set
 * and the tagged set are identical by construction.
 */
export function buildLedgerWhere({
  userId,
  tagIds,
  startDate,
  endDate,
  accountId,
}: LedgerWhereArgs): {
  expenseWhere: Prisma.ExpenseTransactionWhereInput;
  incomeWhere: Prisma.IncomeTransactionWhereInput;
} {
  const date = buildDateRange(startDate, endDate);

  const shared = {
    userId,
    ...(tagIds?.length ? { tags: { some: { id: { in: tagIds } } } } : {}),
    ...(date ? { date } : {}),
    ...(accountId ? { accountId } : {}),
  };

  const incomeWhere: Prisma.IncomeTransactionWhereInput = shared;

  // Installment parents would double-count against their generated children.
  const expenseWhere: Prisma.ExpenseTransactionWhereInput = {
    ...shared,
    isInstallment: false,
  };

  return { expenseWhere, incomeWhere };
}
