import * as React from "react"

import { Input } from "@/components/ui/input"

function formatNumber(num: number): string {
  if (num === 0) return ""
  const parts = num.toString().split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return parts.join(".")
}

function parseNumber(str: string): number {
  const cleaned = str.replace(/,/g, "")
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

function formatForDisplay(rawStr: string): string {
  if (rawStr === "" || rawStr === ".") return rawStr

  const parts = rawStr.split(".")
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")

  if (rawStr.endsWith(".")) return parts[0] + "."
  return parts.join(".")
}

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number | string | undefined
  onValueChange: (value: number) => void
}

function toNumber(v: number | string | undefined): number {
  if (v == null) return 0
  if (typeof v === "string") return parseNumber(v)
  return v
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() =>
      formatNumber(toNumber(value))
    )
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    React.useEffect(() => {
      setDisplayValue(formatNumber(toNumber(value)))
    }, [value])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value
      const cursorPos = e.target.selectionStart ?? 0

      let cleaned = raw.replace(/[^0-9.]/g, "")

      const dotIndex = cleaned.indexOf(".")
      if (dotIndex !== -1) {
        cleaned =
          cleaned.slice(0, dotIndex + 1) +
          cleaned.slice(dotIndex + 1).replace(/\./g, "")
      }

      const commasBefore = (raw.slice(0, cursorPos).match(/,/g) || []).length
      const newDisplay = formatForDisplay(cleaned)
      const commasAfter = (
        newDisplay.slice(0, cursorPos).match(/,/g) || []
      ).length
      const newCursor = cursorPos + (commasAfter - commasBefore)

      setDisplayValue(newDisplay)
      onValueChange(parseNumber(cleaned))

      const el = inputRef.current
      if (el) {
        requestAnimationFrame(() => {
          el.setSelectionRange(newCursor, newCursor)
        })
      }
    }

    return (
      <Input
        ref={(node) => {
          inputRef.current = node
          if (typeof ref === "function") {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
        }}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
