import { useMemo } from "react";
import { useAccountsQuery } from "@/hooks/useAccountsQuery";
import { useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";
import { useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";
import { useTagsQuery } from "@/hooks/useTagsQuery";
import { useTransferTypesQuery } from "@/hooks/useTransferTypesQuery";

// Option lists for the mobile filter sheet. Every list is already cached by
// the hooks the tables use, so these reads are normally free.

export function useExpenseFilterOptions() {
  const { accounts } = useAccountsQuery({ includeCards: true });
  const { budgets } = useExpenseTypesQuery();
  const { tags } = useTagsQuery();
  return useMemo(() => ({ accounts, categories: budgets, tags }), [accounts, budgets, tags]);
}

export function useIncomeFilterOptions() {
  const { accounts } = useAccountsQuery({ includeCards: true });
  const { incomeTypes } = useIncomeTypesQuery();
  const { tags } = useTagsQuery();
  return useMemo(() => ({ accounts, categories: incomeTypes, tags }), [accounts, incomeTypes, tags]);
}

export function useTransferFilterOptions() {
  const { accounts } = useAccountsQuery({ includeCards: true });
  const { transferTypes } = useTransferTypesQuery();
  const { tags } = useTagsQuery();
  return useMemo(() => ({ accounts, categories: transferTypes, tags }), [accounts, transferTypes, tags]);
}
