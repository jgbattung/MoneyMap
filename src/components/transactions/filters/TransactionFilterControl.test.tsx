import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TransactionFilterControl } from "./TransactionFilterControl";
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

function setup(
  variant: "desktop" | "mobile",
  filters: TransactionFilters = EMPTY_FILTERS,
  extra: Partial<React.ComponentProps<typeof TransactionFilterControl>> = {}
) {
  const onApply = vi.fn();
  render(
    <TransactionFilterControl
      kind="expense"
      variant={variant}
      filters={filters}
      activeCount={0}
      onApply={onApply}
      options={options}
      {...extra}
    />
  );
  return { onApply };
}

const open = (variant: "desktop" | "mobile") =>
  fireEvent.click(
    screen.getByRole("button", { name: variant === "desktop" ? /filters/i : "Filters", hidden: true })
  );

// vaul keeps its content mounted until an animationend that happy-dom never fires,
// so closed means "no open dialog" rather than "not in the DOM".
const isOpen = () => document.querySelector("[role=dialog]:not([data-state=closed])") !== null;

describe.each(["desktop", "mobile"] as const)("TransactionFilterControl (%s)", (variant) => {
  it("renders a trigger and opens the panel with Reset and Apply", () => {
    setup(variant);
    expect(isOpen()).toBe(false);
    open(variant);
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset" })).toBeTruthy();
  });

  it("opens showing the currently applied filters", () => {
    setup(variant, { ...EMPTY_FILTERS, accountIds: ["a1"] }, { activeCount: 1 });
    open(variant);
    expect(screen.getByText("1 account selected")).toBeTruthy();
  });

  it("edits do not call onApply until Apply is pressed", () => {
    const { onApply } = setup(variant);
    open(variant);
    fireEvent.change(screen.getByLabelText("Minimum amount"), { target: { value: "50." } });
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledTimes(1);
    // trailing dot is normalized before reaching the caller
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ amountMin: "50" }));
    expect(isOpen()).toBe(false);
  });

  it("Reset clears the draft without calling onApply", () => {
    const { onApply } = setup(variant, { ...EMPTY_FILTERS, tagIds: ["t1"] }, { activeCount: 1 });
    open(variant);
    expect(screen.getByText("1 tag selected")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.queryByText("1 tag selected")).toBeNull();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("disables Apply while the draft is invalid", () => {
    const { onApply } = setup(variant);
    open(variant);
    fireEvent.change(screen.getByLabelText("Minimum amount"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Maximum amount"), { target: { value: "5" } });
    const apply = screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.click(apply);
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Maximum amount"), { target: { value: "50" } });
    expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("closing without Apply discards the draft", () => {
    const { onApply } = setup(variant);
    open(variant);
    fireEvent.change(screen.getByLabelText("Minimum amount"), { target: { value: "99" } });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onApply).not.toHaveBeenCalled();
    expect(isOpen()).toBe(false);
    open(variant);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ amountMin: "" }));
  });
});

describe("TransactionFilterControl layout specifics", () => {
  it("desktop shows the Filters label and mobile uses chips for category", () => {
    setup("desktop");
    expect(screen.getByText("Filters")).toBeTruthy();
    cleanup();
    setup("mobile");
    open("mobile");
    expect(screen.getByRole("group", { name: "Category" })).toBeTruthy();
    expect(screen.getByText("Filters", { selector: "h2, [data-slot=drawer-title]" })).toBeTruthy();
  });

  it("hides Account when hideAccount is set", () => {
    setup("desktop", EMPTY_FILTERS, { hideAccount: true });
    open("desktop");
    expect(screen.queryByRole("button", { name: /any account/i })).toBeNull();
  });
});

describe("TransactionFilterControl date range and transfers", () => {
  it("blocks Apply while the custom range is reversed, then applies a valid range", () => {
    const { onApply } = setup("desktop", { ...EMPTY_FILTERS, startDate: "2026-03-20", endDate: "2026-03-10" }, { activeCount: 1 });
    open("desktop");
    expect(screen.getByRole("alert").textContent).toBe("Start date must be on or before end date");
    const apply = screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.click(apply);
    expect(onApply).not.toHaveBeenCalled();

    // Move the start before the end with the form date picker
    fireEvent.click(screen.getByLabelText("From date"));
    fireEvent.click(screen.getByRole("button", { name: /March 5th, 2026/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2026-03-05", endDate: "2026-03-10" })
    );
  });

  it("applies separate From and To account selections for transfers", () => {
    const { onApply } = setup("desktop", EMPTY_FILTERS, { kind: "transfer" });
    open("desktop");
    const [fromTrigger, toTrigger] = screen.getAllByRole("button", { name: /any account/i });
    fireEvent.click(fromTrigger);
    fireEvent.click(screen.getByText("BPI Savings"));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    fireEvent.click(toTrigger);
    fireEvent.click(screen.getAllByText("BDO").at(-1)!);
    // the open account dropdown leaves the panel aria-hidden behind it
    fireEvent.click(screen.getByRole("button", { name: "Apply", hidden: true }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ fromAccountIds: ["a1"], toAccountIds: ["a2"], accountIds: [] })
    );
  });
});
