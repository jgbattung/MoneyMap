import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  EMPTY_FILTERS,
  type TransactionFilters,
  type TransactionKind,
} from "@/lib/transaction-filters";

const MAX_IDS = 50;

export interface ParsedListParams {
  skip?: number;
  take?: number;
  search?: string;
  accountId?: string;
  filters: TransactionFilters;
}

export type ParseListParamsResult =
  | { success: true; data: ParsedListParams }
  | { success: false; error: z.ZodError };

const idList = z
  .string()
  .optional()
  .transform((val) =>
    (val ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  )
  .pipe(z.array(z.string()).max(MAX_IDS, `At most ${MAX_IDS} ids allowed`));

const amountString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount")
  .optional();

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
  }, "Invalid date")
  .optional();

const intString = z
  .string()
  .regex(/^\d+$/, "Must be a non-negative integer")
  .optional();

const ListParamsSchema = z
  .object({
    skip: intString,
    take: intString,
    search: z.string().optional(),
    accountId: z.string().optional(),
    accountIds: idList,
    fromAccountIds: idList,
    toAccountIds: idList,
    categoryIds: idList,
    tagIds: idList,
    amountMin: amountString,
    amountMax: amountString,
    startDate: dateString,
    endDate: dateString,
  })
  .superRefine((val, ctx) => {
    if (
      val.amountMin !== undefined &&
      val.amountMax !== undefined &&
      parseFloat(val.amountMin) > parseFloat(val.amountMax)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["amountMin"],
        message: "amountMin must be less than or equal to amountMax",
      });
    }
    if (
      val.startDate !== undefined &&
      val.endDate !== undefined &&
      val.startDate > val.endDate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "startDate must be on or before endDate",
      });
    }
  });

const RAW_KEYS = [
  "skip",
  "take",
  "search",
  "accountId",
  "accountIds",
  "fromAccountIds",
  "toAccountIds",
  "categoryIds",
  "tagIds",
  "amountMin",
  "amountMax",
  "startDate",
  "endDate",
] as const;

export function parseListParams(
  searchParams: URLSearchParams,
  kind: TransactionKind
): ParseListParamsResult {
  const raw: Record<string, string> = {};
  for (const key of RAW_KEYS) {
    const value = searchParams.get(key);
    // Empty strings are treated as unset, matching the previous truthiness checks.
    if (value !== null && value !== "") raw[key] = value;
  }

  const parsed = ListParamsSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error };

  const v = parsed.data;
  const search = v.search && v.search.trim().length > 0 ? v.search : undefined;

  return {
    success: true,
    data: {
      skip: v.skip !== undefined ? Math.min(parseInt(v.skip, 10), 10000) : undefined,
      take: v.take !== undefined ? Math.min(parseInt(v.take, 10), 100) : undefined,
      search,
      accountId: v.accountId,
      filters: {
        ...EMPTY_FILTERS,
        accountIds: kind === "transfer" ? [] : v.accountIds,
        fromAccountIds: kind === "transfer" ? v.fromAccountIds : [],
        toAccountIds: kind === "transfer" ? v.toAccountIds : [],
        categoryIds: v.categoryIds,
        tagIds: v.tagIds,
        amountMin: v.amountMin ?? "",
        amountMax: v.amountMax ?? "",
        startDate: v.startDate ?? "",
        endDate: v.endDate ?? "",
      },
    },
  };
}

function insensitive(search: string) {
  return { contains: search, mode: "insensitive" as Prisma.QueryMode };
}

function tagSearch(search: string) {
  return { tags: { some: { name: insensitive(search) } } };
}

function dateCondition(filters: TransactionFilters) {
  if (!filters.startDate && !filters.endDate) return null;
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.startDate) range.gte = new Date(filters.startDate);
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setUTCHours(23, 59, 59, 999);
    range.lte = end;
  }
  return range;
}

function decimalRange(filters: TransactionFilters) {
  if (!filters.amountMin && !filters.amountMax) return null;
  const range: { gte?: Prisma.Decimal; lte?: Prisma.Decimal } = {};
  if (filters.amountMin) range.gte = new Prisma.Decimal(filters.amountMin);
  if (filters.amountMax) range.lte = new Prisma.Decimal(filters.amountMax);
  return range;
}

function numberRange(filters: TransactionFilters) {
  if (!filters.amountMin && !filters.amountMax) return null;
  const range: { gte?: number; lte?: number } = {};
  if (filters.amountMin) range.gte = Number(filters.amountMin);
  if (filters.amountMax) range.lte = Number(filters.amountMax);
  return range;
}

export function buildExpenseWhere(
  userId: string,
  data: ParsedListParams
): Prisma.ExpenseTransactionWhereInput {
  const { filters, search, accountId } = data;
  const and: Prisma.ExpenseTransactionWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { name: insensitive(search) },
        { description: insensitive(search) },
        { account: { name: insensitive(search) } },
        { expenseType: { name: insensitive(search) } },
        { expenseSubcategory: { name: insensitive(search) } },
        tagSearch(search),
      ],
    });
  }
  if (accountId) and.push({ accountId });
  if (filters.accountIds.length > 0) and.push({ accountId: { in: filters.accountIds } });
  if (filters.categoryIds.length > 0) and.push({ expenseTypeId: { in: filters.categoryIds } });
  if (filters.tagIds.length > 0) {
    and.push({ tags: { some: { id: { in: filters.tagIds } } } });
  }
  const amount = decimalRange(filters);
  if (amount) and.push({ amount });
  const date = dateCondition(filters);
  if (date) and.push({ date });

  return {
    userId,
    isInstallment: false,
    ...(and.length > 0 && { AND: and }),
  };
}

export function buildIncomeWhere(
  userId: string,
  data: ParsedListParams
): Prisma.IncomeTransactionWhereInput {
  const { filters, search, accountId } = data;
  const and: Prisma.IncomeTransactionWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { name: insensitive(search) },
        { description: insensitive(search) },
        { account: { name: insensitive(search) } },
        { incomeType: { name: insensitive(search) } },
        tagSearch(search),
      ],
    });
  }
  if (accountId) and.push({ accountId });
  if (filters.accountIds.length > 0) and.push({ accountId: { in: filters.accountIds } });
  if (filters.categoryIds.length > 0) and.push({ incomeTypeId: { in: filters.categoryIds } });
  if (filters.tagIds.length > 0) {
    and.push({ tags: { some: { id: { in: filters.tagIds } } } });
  }
  const amount = decimalRange(filters);
  if (amount) and.push({ amount });
  const date = dateCondition(filters);
  if (date) and.push({ date });

  return {
    userId,
    ...(and.length > 0 && { AND: and }),
  };
}

export function buildTransferWhere(
  userId: string,
  data: ParsedListParams
): Prisma.TransferTransactionWhereInput {
  const { filters, search, accountId } = data;
  const and: Prisma.TransferTransactionWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { name: insensitive(search) },
        { notes: insensitive(search) },
        { fromAccount: { name: insensitive(search) } },
        { toAccount: { name: insensitive(search) } },
        { transferType: { name: insensitive(search) } },
        tagSearch(search),
      ],
    });
  }
  if (accountId) {
    and.push({ OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] });
  }
  if (filters.fromAccountIds.length > 0) {
    and.push({ fromAccountId: { in: filters.fromAccountIds } });
  }
  if (filters.toAccountIds.length > 0) {
    and.push({ toAccountId: { in: filters.toAccountIds } });
  }
  if (filters.categoryIds.length > 0) and.push({ transferTypeId: { in: filters.categoryIds } });
  if (filters.tagIds.length > 0) {
    and.push({ tags: { some: { id: { in: filters.tagIds } } } });
  }
  const amount = numberRange(filters);
  if (amount) and.push({ amount });
  const date = dateCondition(filters);
  if (date) and.push({ date });

  return {
    userId,
    ...(and.length > 0 && { AND: and }),
  };
}
