import { db } from "@/lib/prisma";

type Refs = {
  accountIds?: (string | null | undefined)[];
  expenseTypeId?: string | null;
  incomeTypeId?: string | null;
  transferTypeId?: string | null;
  tagIds?: string[];
};

type Check = { message: string; ids: string[]; count: (ids: string[]) => Promise<number> };

function distinct(ids: (string | null | undefined)[] | undefined): string[] {
  return [...new Set((ids ?? []).filter((id): id is string => !!id))];
}

// Returns the first "not found" message for a referenced id the user does not
// own, or null when every reference belongs to the user. Counts run in parallel.
export async function findUnownedRef(
  userId: string,
  refs: Refs
): Promise<string | null> {
  const allChecks: Check[] = [
    {
      message: "Account not found",
      ids: distinct(refs.accountIds),
      count: (ids) => db.financialAccount.count({ where: { id: { in: ids }, userId } }),
    },
    {
      message: "Expense type not found",
      ids: distinct([refs.expenseTypeId]),
      count: (ids) => db.expenseType.count({ where: { id: { in: ids }, userId } }),
    },
    {
      message: "Income type not found",
      ids: distinct([refs.incomeTypeId]),
      count: (ids) => db.incomeType.count({ where: { id: { in: ids }, userId } }),
    },
    {
      message: "Transfer type not found",
      ids: distinct([refs.transferTypeId]),
      count: (ids) => db.transferType.count({ where: { id: { in: ids }, userId } }),
    },
    {
      message: "Tag not found",
      ids: distinct(refs.tagIds),
      count: (ids) => db.tag.count({ where: { id: { in: ids }, userId } }),
    },
  ];
  const checks = allChecks.filter((check) => check.ids.length > 0);

  const counts = await Promise.all(checks.map((check) => check.count(check.ids)));
  const failed = checks.find((check, i) => counts[i] < check.ids.length);

  return failed ? failed.message : null;
}
