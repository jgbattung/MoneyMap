import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MobileFilterBar } from "./MobileFilterBar";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import type { TransactionKind } from "@/lib/transaction-filters";

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
  // cmdk, Radix and vaul need these in happy-dom
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

// Real filter state, real control, chips and summary: only the list data is faked.
function Harness({
  kind = "expense",
  hideAccount,
  searchTerm = "",
  onSearchChange = () => {},
  isLoading = false,
  isSearching = false,
  onState,
}: {
  kind?: TransactionKind;
  hideAccount?: boolean;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  isLoading?: boolean;
  isSearching?: boolean;
  onState?: (s: ReturnType<typeof useTransactionFilters>) => void;
}) {
  const filterState = useTransactionFilters();
  onState?.(filterState);
  return (
    <MobileFilterBar
      kind={kind}
      filterState={filterState}
      options={options}
      hideAccount={hideAccount}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search expenses..."
      isLoading={isLoading}
      isSearching={isSearching}
      total={3}
      totalAmount="4500.50"
    />
  );
}

const preset = (name: string) => screen.getByRole("radio", { name, hidden: true });
const openSheet = () => fireEvent.click(screen.getByRole("button", { name: "Filters" }));
const apply = () => fireEvent.click(screen.getByRole("button", { name: "Apply" }));
// vaul never fires animationend in happy-dom, so after Apply the page behind the
// sheet stays aria-hidden; query it with hidden: true.
const button = (name: string) => screen.getByRole("button", { name, hidden: true });

describe("MobileFilterBar", () => {
  it("offers the four presets with View All selected and no total line", () => {
    render(<Harness />);
    for (const name of ["View All", "This Week", "This Month", "This Year"]) {
      expect(preset(name)).toBeTruthy();
    }
    expect(preset("View All").getAttribute("data-state")).toBe("on");
    expect(screen.queryByText(/across/)).toBeNull();
  });

  it("selecting This Week selects it, resolves its range and shows the total line", () => {
    let state: ReturnType<typeof useTransactionFilters> | undefined;
    render(<Harness onState={(s) => (state = s)} />);
    fireEvent.click(preset("This Week"));
    expect(preset("This Week").getAttribute("data-state")).toBe("on");
    expect(preset("View All").getAttribute("data-state")).toBe("off");
    expect(state?.queryDates.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByText("₱4,500.50")).toBeTruthy();
    expect(screen.getByText("across 3 transactions")).toBeTruthy();
  });

  it("clicking the selected preset again keeps it selected", () => {
    render(<Harness />);
    fireEvent.click(preset("This Month"));
    fireEvent.click(preset("This Month"));
    expect(preset("This Month").getAttribute("data-state")).toBe("on");
  });

  it("shows the total line while searching and hides it while loading", () => {
    render(<Harness isSearching />);
    expect(screen.getByText("across 3 transactions")).toBeTruthy();
    cleanup();
    render(<Harness isSearching isLoading />);
    expect(screen.queryByText(/across/)).toBeNull();
  });

  it("uses the count-only total line for transfers", () => {
    render(<Harness kind="transfer" isSearching />);
    expect(screen.getByText("3 transfers")).toBeTruthy();
    expect(screen.queryByText(/₱/)).toBeNull();
  });

  it("forwards typing to onSearchChange", () => {
    const onSearchChange = vi.fn();
    render(<Harness onSearchChange={onSearchChange} />);
    fireEvent.change(screen.getByPlaceholderText("Search expenses..."), { target: { value: "rent" } });
    expect(onSearchChange).toHaveBeenCalledWith("rent");
  });

  it("applying from the sheet adds a chip and badge; removing the chip drops it immediately", () => {
    render(<Harness />);
    openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Food" }));
    apply();
    expect(screen.getByText("Category: Food")).toBeTruthy();
    expect(screen.getByTestId("filter-count").textContent).toBe("1");
    expect(screen.getByText("across 3 transactions")).toBeTruthy();
    fireEvent.click(button("Remove filter Category: Food"));
    expect(screen.queryByText("Category: Food")).toBeNull();
    expect(screen.queryByTestId("filter-count")).toBeNull();
    expect(screen.queryByText(/across/)).toBeNull();
  });

  it("Clear all resets the panel filters and the preset", () => {
    render(<Harness />);
    fireEvent.click(preset("This Year"));
    openSheet();
    fireEvent.click(screen.getByRole("button", { name: "Rent" }));
    apply();
    fireEvent.click(button("Clear all"));
    expect(screen.queryByText("Category: Rent")).toBeNull();
    expect(preset("View All").getAttribute("data-state")).toBe("on");
    expect(screen.queryByText(/across/)).toBeNull();
  });

  it("hides the Account field when hideAccount is set but keeps From/To for transfers", () => {
    render(<Harness hideAccount />);
    openSheet();
    expect(screen.queryByText("Account", { selector: "label" })).toBeNull();
    cleanup();
    render(<Harness kind="transfer" hideAccount />);
    openSheet();
    expect(screen.getByText("From account")).toBeTruthy();
    expect(screen.getByText("To account")).toBeTruthy();
  });
});
