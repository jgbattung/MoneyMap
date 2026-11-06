import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterButton } from "./FilterButton";

describe("FilterButton", () => {
  it("desktop shows the Filters label and no badge at zero", () => {
    render(<FilterButton variant="desktop" count={0} />);
    expect(screen.getByRole("button", { name: /filters/i })).toBeTruthy();
    expect(screen.queryByTestId("filter-count")).toBeNull();
  });

  it("desktop shows the count badge", () => {
    render(<FilterButton variant="desktop" count={3} />);
    expect(screen.getByTestId("filter-count").textContent).toBe("3");
  });

  it("mobile is icon-only with an aria-label", () => {
    render(<FilterButton variant="mobile" count={2} />);
    const button = screen.getByRole("button", { name: "Filters" });
    expect(button.getAttribute("aria-label")).toBe("Filters");
    expect(screen.queryByText("Filters")).toBeNull();
    expect(screen.getByTestId("filter-count").textContent).toBe("2");
  });

  it("forwards click handlers and refs", () => {
    const onClick = vi.fn();
    const ref = { current: null as HTMLButtonElement | null };
    render(<FilterButton variant="desktop" count={0} onClick={onClick} ref={ref} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
