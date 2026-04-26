import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { CurrencyInput } from "./currency-input"

function getInputValue(): string {
  return (screen.getByRole("textbox") as HTMLInputElement).value
}

describe("CurrencyInput", () => {
  describe("initial rendering", () => {
    it("displays formatted value on mount", () => {
      render(<CurrencyInput value={1234.56} onValueChange={vi.fn()} />)
      expect(getInputValue()).toBe("1,234.56")
    })

    it("displays empty string when value is 0", () => {
      render(<CurrencyInput value={0} onValueChange={vi.fn()} />)
      expect(getInputValue()).toBe("")
    })

    it("displays empty string when value is undefined", () => {
      render(<CurrencyInput value={undefined} onValueChange={vi.fn()} />)
      expect(getInputValue()).toBe("")
    })

    it("parses string value on mount", () => {
      render(<CurrencyInput value="5000" onValueChange={vi.fn()} />)
      expect(getInputValue()).toBe("5,000")
    })
  })

  describe("user input", () => {
    it("calls onValueChange with cleaned numeric string", () => {
      const onValueChange = vi.fn()
      render(<CurrencyInput value={0} onValueChange={onValueChange} />)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "1234" } })
      expect(onValueChange).toHaveBeenCalledWith("1234")
    })

    it("formats display with thousand separators", () => {
      render(<CurrencyInput value={0} onValueChange={vi.fn()} />)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "1234567" } })
      expect(getInputValue()).toBe("1,234,567")
    })

    it("strips non-numeric characters except decimal", () => {
      const onValueChange = vi.fn()
      render(<CurrencyInput value={0} onValueChange={onValueChange} />)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "12abc34" } })
      expect(onValueChange).toHaveBeenCalledWith("1234")
    })

    it("allows only one decimal point", () => {
      const onValueChange = vi.fn()
      render(<CurrencyInput value={0} onValueChange={onValueChange} />)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "12.34.56" } })
      expect(onValueChange).toHaveBeenCalledWith("12.3456")
    })
  })

  describe("decimal point preservation (bug fix)", () => {
    it("preserves trailing decimal point when user types '.'", () => {
      render(<CurrencyInput value={0} onValueChange={vi.fn()} />)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "100." } })
      expect(getInputValue()).toBe("100.")
    })

    it("preserves trailing decimal with zero like '100.0'", () => {
      render(<CurrencyInput value={0} onValueChange={vi.fn()} />)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "100.0" } })
      expect(getInputValue()).toBe("100.0")
    })

    it("does not lose decimal point when parent re-renders with numeric equivalent", () => {
      const onValueChange = vi.fn()
      const { rerender } = render(
        <CurrencyInput value={0} onValueChange={onValueChange} />
      )

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "50." } })
      expect(getInputValue()).toBe("50.")

      rerender(<CurrencyInput value="50." onValueChange={onValueChange} />)
      expect(getInputValue()).toBe("50.")
    })

    it("handles just a decimal point", () => {
      render(<CurrencyInput value={0} onValueChange={vi.fn()} />)
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "." } })
      expect(getInputValue()).toBe(".")
    })
  })

  describe("external value sync", () => {
    it("updates display when value prop changes externally", () => {
      const onValueChange = vi.fn()
      const { rerender } = render(
        <CurrencyInput value={100} onValueChange={onValueChange} />
      )
      expect(getInputValue()).toBe("100")

      rerender(<CurrencyInput value={250} onValueChange={onValueChange} />)
      expect(getInputValue()).toBe("250")
    })

    it("clears display when value is reset to 0", () => {
      const onValueChange = vi.fn()
      const { rerender } = render(
        <CurrencyInput value={500} onValueChange={onValueChange} />
      )

      rerender(<CurrencyInput value={0} onValueChange={onValueChange} />)
      expect(getInputValue()).toBe("")
    })

    it("formats large external values with commas", () => {
      const onValueChange = vi.fn()
      const { rerender } = render(
        <CurrencyInput value={0} onValueChange={onValueChange} />
      )

      rerender(<CurrencyInput value={1234567.89} onValueChange={onValueChange} />)
      expect(getInputValue()).toBe("1,234,567.89")
    })
  })
})
