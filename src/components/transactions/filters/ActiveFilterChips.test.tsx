import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { EMPTY_FILTERS } from "@/lib/transaction-filters";

const options = {
  accounts: [
    { id: "a1", name: "BPI Savings" },
    { id: "a2", name: "BDO" },
    { id: "a3", name: "Cash" },
  ],
  categories: [
    { id: "c1", name: "Food" },
    { id: "c2", name: "Rent" },
  ],
  tags: [{ id: "t1", name: "Birthday" }],
};

function setup(props: Partial<React.ComponentProps<typeof ActiveFilterChips>>) {
  const onRemove = vi.fn();
  const onClearAll = vi.fn();
  const utils = render(
    <ActiveFilterChips
      kind="expense"
      filters={EMPTY_FILTERS}
      options={options}
      onRemove={onRemove}
      onClearAll={onClearAll}
      {...props}
    />
  );
  return { onRemove, onClearAll, ...utils };
}

describe("ActiveFilterChips", () => {
  it("renders nothing when no panel filter is active", () => {
    const { container } = setup({});
    expect(container.innerHTML).toBe("");
  });

  it("labels single and multi account selections", () => {
    const { rerender, onRemove, onClearAll } = setup({
      filters: { ...EMPTY_FILTERS, accountIds: ["a1"] },
    });
    expect(screen.getByText("Account: BPI Savings")).toBeTruthy();
    rerender(
      <ActiveFilterChips
        kind="expense"
        filters={{ ...EMPTY_FILTERS, accountIds: ["a1", "a2", "a3"] }}
        options={options}
        onRemove={onRemove}
        onClearAll={onClearAll}
      />
    );
    expect(screen.getByText("3 accounts")).toBeTruthy();
  });

  it("labels category, tags and from/to", () => {
    setup({
      kind: "transfer",
      filters: {
        ...EMPTY_FILTERS,
        fromAccountIds: ["a1"],
        toAccountIds: ["a2", "a3"],
        categoryIds: ["c1"],
        tagIds: ["t1"],
      },
    });
    expect(screen.getByText("From: BPI Savings")).toBeTruthy();
    expect(screen.getByText("To: 2 accounts")).toBeTruthy();
    expect(screen.getByText("Category: Food")).toBeTruthy();
    expect(screen.getByText("Tags: Birthday")).toBeTruthy();
  });

  it("does not show an account chip for transfers or from/to for expenses", () => {
    setup({ kind: "transfer", filters: { ...EMPTY_FILTERS, accountIds: ["a1"] } });
    expect(screen.queryByText(/Account:/)).toBeNull();
  });

  it("labels amounts: min only, max only, both", () => {
    const { rerender, onRemove, onClearAll } = setup({
      filters: { ...EMPTY_FILTERS, amountMin: "5000" },
    });
    expect(screen.getByText("Amount: ≥ ₱5,000")).toBeTruthy();
    const again = (f: Partial<typeof EMPTY_FILTERS>) =>
      rerender(
        <ActiveFilterChips
          kind="expense"
          filters={{ ...EMPTY_FILTERS, ...f }}
          options={options}
          onRemove={onRemove}
          onClearAll={onClearAll}
        />
      );
    again({ amountMax: "5000" });
    expect(screen.getByText("Amount: ≤ ₱5,000")).toBeTruthy();
    again({ amountMin: "1000", amountMax: "5000.5" });
    expect(screen.getByText("Amount: ₱1,000 – ₱5,000.5")).toBeTruthy();
  });

  it("labels dates and collapses the year when shared", () => {
    const { rerender, onRemove, onClearAll } = setup({
      filters: { ...EMPTY_FILTERS, startDate: "2026-01-01", endDate: "2026-03-31" },
    });
    expect(screen.getByText("Date: Jan 1 – Mar 31, 2026")).toBeTruthy();
    rerender(
      <ActiveFilterChips
        kind="expense"
        filters={{ ...EMPTY_FILTERS, startDate: "2025-12-01", endDate: "2026-01-31" }}
        options={options}
        onRemove={onRemove}
        onClearAll={onClearAll}
      />
    );
    expect(screen.getByText("Date: Dec 1, 2025 – Jan 31, 2026")).toBeTruthy();
  });

  it("removing a chip calls onRemove with its group", () => {
    const { onRemove } = setup({
      filters: {
        ...EMPTY_FILTERS,
        accountIds: ["a1"],
        categoryIds: ["c1"],
        tagIds: ["t1"],
        amountMin: "1",
        startDate: "2026-01-01",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Account: BPI Savings" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Category: Food" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Tags: Birthday" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove filter Amount/ }));
    fireEvent.click(screen.getByRole("button", { name: /Remove filter Date/ }));
    expect(onRemove.mock.calls.map((c) => c[0])).toEqual([
      "account",
      "category",
      "tags",
      "amount",
      "date",
    ]);
  });

  it("removing from/to chips passes from and to", () => {
    const { onRemove } = setup({
      kind: "transfer",
      filters: { ...EMPTY_FILTERS, fromAccountIds: ["a1"], toAccountIds: ["a2"] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Remove filter From/ }));
    fireEvent.click(screen.getByRole("button", { name: /Remove filter To/ }));
    expect(onRemove.mock.calls.map((c) => c[0])).toEqual(["from", "to"]);
  });

  it("Clear all calls onClearAll", () => {
    const { onClearAll } = setup({ filters: { ...EMPTY_FILTERS, tagIds: ["t1"] } });
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
