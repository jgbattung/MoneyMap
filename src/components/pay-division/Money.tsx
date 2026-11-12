import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface MoneyProps {
  /** Decimal string ("1234.50") or number. */
  amount: string | number
  className?: string
}

/** Peso amount in the monospace money style. */
export const Money = ({ amount, className }: MoneyProps) => {
  const value = typeof amount === "number" ? amount : parseFloat(amount)
  return (
    <span className={cn("text-numeric", className)}>
      ₱{formatCurrency(Number.isFinite(value) ? value : 0)}
    </span>
  )
}
