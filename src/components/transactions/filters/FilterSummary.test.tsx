import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterSummary } from "./FilterSummary";

describe("FilterSummary", () => {
  it("shows amount and plural transactions for expense", () => {
    render(<FilterSummary kind="expense" total={23} totalAmount="12480" />);
    expect(screen.getByText("₱12,480.00")).toBeTruthy();
    expect(screen.getByText("across 23 transactions")).toBeTruthy();
  });

  it("uses the singular for one transaction", () => {
    render(<FilterSummary kind="income" total={1} totalAmount="5.5" />);
    expect(screen.getByText("₱5.50")).toBeTruthy();
    expect(screen.getByText("across 1 transaction")).toBeTruthy();
  });

  it("falls back to zero when no amount is given", () => {
    render(<FilterSummary kind="expense" total={0} />);
    expect(screen.getByText("₱0.00")).toBeTruthy();
  });

  it("transfer variant is count only", () => {
    const { rerender } = render(<FilterSummary kind="transfer" total={6} />);
    expect(screen.getByText("6 transfers")).toBeTruthy();
    expect(screen.queryByText(/₱/)).toBeNull();
    rerender(<FilterSummary kind="transfer" total={1} />);
    expect(screen.getByText("1 transfer")).toBeTruthy();
  });

  it("is content-width, not full width", () => {
    const { container } = render(<FilterSummary kind="expense" total={2} totalAmount="1" />);
    expect((container.firstChild as HTMLElement).className).toContain("inline-flex");
  });
});
