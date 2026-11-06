/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/hooks/useAccountsQuery", () => ({ useAccountsQuery: vi.fn() }));
vi.mock("@/hooks/useExpenseTypesQuery", () => ({ useExpenseTypesQuery: vi.fn() }));
vi.mock("@/hooks/useIncomeTypesQuery", () => ({ useIncomeTypesQuery: vi.fn() }));
vi.mock("@/hooks/useTransferTypesQuery", () => ({ useTransferTypesQuery: vi.fn() }));
vi.mock("@/hooks/useTagsQuery", () => ({ useTagsQuery: vi.fn() }));

import { useAccountsQuery } from "@/hooks/useAccountsQuery";
import { useExpenseTypesQuery } from "@/hooks/useExpenseTypesQuery";
import { useIncomeTypesQuery } from "@/hooks/useIncomeTypesQuery";
import { useTransferTypesQuery } from "@/hooks/useTransferTypesQuery";
import { useTagsQuery } from "@/hooks/useTagsQuery";
import {
  useExpenseFilterOptions,
  useIncomeFilterOptions,
  useTransferFilterOptions,
} from "./useTransactionFilterOptions";

const accounts = [
  { id: "a1", name: "BPI Savings" },
  { id: "card-1", name: "Visa Card" },
];
const tags = [{ id: "t1", name: "Birthday" }];

describe("useTransactionFilterOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAccountsQuery).mockReturnValue({ accounts } as any);
    vi.mocked(useExpenseTypesQuery).mockReturnValue({ budgets: [{ id: "e1", name: "Food" }] } as any);
    vi.mocked(useIncomeTypesQuery).mockReturnValue({ incomeTypes: [{ id: "i1", name: "Salary" }] } as any);
    vi.mocked(useTransferTypesQuery).mockReturnValue({ transferTypes: [{ id: "x1", name: "Savings" }] } as any);
    vi.mocked(useTagsQuery).mockReturnValue({ tags } as any);
  });

  it("requests accounts including cards for every kind", () => {
    renderHook(() => useExpenseFilterOptions());
    renderHook(() => useIncomeFilterOptions());
    renderHook(() => useTransferFilterOptions());
    expect(vi.mocked(useAccountsQuery).mock.calls).toEqual([
      [{ includeCards: true }],
      [{ includeCards: true }],
      [{ includeCards: true }],
    ]);
  });

  it("maps each kind's main types to categories", () => {
    expect(renderHook(() => useExpenseFilterOptions()).result.current).toEqual({
      accounts,
      categories: [{ id: "e1", name: "Food" }],
      tags,
    });
    expect(renderHook(() => useIncomeFilterOptions()).result.current.categories).toEqual([
      { id: "i1", name: "Salary" },
    ]);
    expect(renderHook(() => useTransferFilterOptions()).result.current.categories).toEqual([
      { id: "x1", name: "Savings" },
    ]);
  });

  it("keeps a stable reference across re-renders when inputs are unchanged", () => {
    const { result, rerender } = renderHook(() => useExpenseFilterOptions());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
