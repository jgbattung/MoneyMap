import { formatCurrency } from "@/lib/format";
import type { TransactionKind } from "@/lib/transaction-filters";

interface FilterSummaryProps {
  kind: TransactionKind;
  total: number;
  totalAmount?: string;
}

export function FilterSummary({ kind, total, totalAmount }: FilterSummaryProps) {
  if (kind === "transfer") {
    return (
      <div className="inline-flex w-fit items-center rounded-lg bg-card px-3 py-1.5 text-sm text-muted-foreground">
        {total} {total === 1 ? "transfer" : "transfers"}
      </div>
    );
  }

  const amount = formatCurrency(parseFloat(totalAmount ?? "0") || 0);
  return (
    <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-card px-3 py-1.5 text-sm text-muted-foreground">
      <span className="text-numeric font-medium text-foreground">₱{amount}</span>
      <span>
        across {total} {total === 1 ? "transaction" : "transactions"}
      </span>
    </div>
  );
}
