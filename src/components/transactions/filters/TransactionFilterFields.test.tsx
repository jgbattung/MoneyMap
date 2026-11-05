import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { useState } from "react";
import { TransactionFilterFields } from "./TransactionFilterFields";
import { EMPTY_FILTERS, type TransactionFilters } from "@/lib/transaction-filters";

const options = {
  accounts: [
    { id: "a1", name: "BPI Savings" },
    { id: "a2", name: "BDO" },
  ],
  categories: [
    { id: "c1", name: "Food" },
    { id: "c2", name: "Rent" },
  ],
  tags: [{ id: "t1", name: "Birthday" }],
};

beforeAll(() => {
  // cmdk and Radix need these in happy-dom
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

function Harness({
  initial = EMPTY_FILTERS,
  onDraft,
  ...props
}: {
  initial?: TransactionFilters;
  onDraft?: (d: TransactionFilters) => void;
} & Partial<React.ComponentProps<typeof TransactionFilterFields>>) {
  const [draft, setDraft] = useState(initial);
  return (
    <TransactionFilterFields
      kind="expense"
      layout="desktop"
      options={options}
      {...props}
      draft={draft}
      onChange={(d) => {
        setDraft(d);
        onDraft?.(d);
      }}
    />
  );
}

function pickFromPopover(triggerText: string | RegExp, optionName: string) {
  fireEvent.click(screen.getByRole("button", { name: triggerText }));
  fireEvent.click(screen.getByText(optionName));
}

describe("TransactionFilterFields", () => {
  it("selecting an account updates the draft", () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    pickFromPopover(/any account/i, "BPI Savings");
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ accountIds: ["a1"] })
    );
  });

  it("toggling the same option again removes it", () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} initial={{ ...EMPTY_FILTERS, accountIds: ["a1"] }} />);
    pickFromPopover(/1 account selected/i, "BPI Savings");
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ accountIds: [] }));
  });

  it("hideAccount removes the Account field", () => {
    render(<Harness hideAccount />);
    expect(screen.queryByText("Account")).toBeNull();
    expect(screen.queryByRole("button", { name: /any account/i })).toBeNull();
  });

  it("transfer shows From and To account fields and no single Account", () => {
    const onDraft = vi.fn();
    render(<Harness kind="transfer" onDraft={onDraft} />);
    expect(screen.getByText("From account")).toBeTruthy();
    expect(screen.getByText("To account")).toBeTruthy();
    expect(screen.queryByText("Account")).toBeNull();

    const [fromTrigger, toTrigger] = screen.getAllByRole("button", { name: /any account/i });
    fireEvent.click(fromTrigger);
    fireEvent.click(screen.getByText("BDO"));
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ fromAccountIds: ["a2"] }));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(toTrigger);
    fireEvent.click(screen.getAllByText("BPI Savings").pop() as HTMLElement);
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ fromAccountIds: ["a2"], toAccountIds: ["a1"] })
    );
  });

  it("hideAccount does not hide transfer From/To", () => {
    render(<Harness kind="transfer" hideAccount />);
    expect(screen.getByText("From account")).toBeTruthy();
  });

  it("desktop category is a dropdown", () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    pickFromPopover(/any category/i, "Food");
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ categoryIds: ["c1"] }));
  });

  it("mobile category renders toggle chips with aria-pressed", () => {
    const onDraft = vi.fn();
    render(<Harness layout="mobile" onDraft={onDraft} />);
    const group = screen.getByRole("group", { name: "Category" });
    const food = within(group).getByRole("button", { name: "Food" });
    expect(food.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(food);
    expect(food.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(group).getByRole("button", { name: "Rent" }));
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryIds: ["c1", "c2"] })
    );
    fireEvent.click(food);
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ categoryIds: ["c2"] }));
    expect(screen.queryByRole("button", { name: /any category/i })).toBeNull();
  });

  it("selecting a tag updates the draft", () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    pickFromPopover(/any tag/i, "Birthday");
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ tagIds: ["t1"] }));
  });

  it("typing min and max amounts updates the draft", () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    fireEvent.change(screen.getByLabelText("Minimum amount"), { target: { value: "1,000" } });
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ amountMin: "1000" }));
    fireEvent.change(screen.getByLabelText("Maximum amount"), { target: { value: "5000.5" } });
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ amountMin: "1000", amountMax: "5000.5" })
    );
  });

  it("shows an inline error when min is greater than max", () => {
    render(<Harness initial={{ ...EMPTY_FILTERS, amountMin: "10", amountMax: "5" }} />);
    expect(screen.getByRole("alert").textContent).toBe("Min must be less than or equal to max");
  });

  it("shows no amount error for equal values", () => {
    render(<Harness initial={{ ...EMPTY_FILTERS, amountMin: "5", amountMax: "5" }} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("picks From and To dates with the calendar and stores YYYY-MM-DD", () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} initial={{ ...EMPTY_FILTERS, startDate: "2026-03-10" }} />);
    const startButton = screen.getByLabelText("From date");
    expect(startButton.textContent).toContain("March, 10, 2026");
    fireEvent.click(startButton);
    fireEvent.click(screen.getByRole("button", { name: /March 20th, 2026/ }));
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ startDate: "2026-03-20" }));

    fireEvent.click(screen.getByLabelText("To date"));
    fireEvent.click(screen.getByRole("button", { name: /15th, [0-9]{4}/ }));
    const last = onDraft.mock.calls.at(-1)?.[0] as TransactionFilters;
    expect(last.startDate).toBe("2026-03-20");
    expect(last.endDate).toMatch(/^[0-9]{4}-[0-9]{2}-15$/);
  });

  it("shows an inline error when start is after end", () => {
    render(
      <Harness
        initial={{ ...EMPTY_FILTERS, startDate: "2026-02-02", endDate: "2026-02-01" }}
      />
    );
    expect(screen.getByRole("alert").textContent).toBe("Start date must be on or before end date");
  });
});
