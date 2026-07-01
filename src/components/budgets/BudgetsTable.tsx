"use client"

import React, { useEffect, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'sonner'
import { IconCheck, IconEdit, IconX } from '@tabler/icons-react'
import { Trash2 } from 'lucide-react'

import { BudgetStatusItem } from '@/hooks/useBudgetStatus'
import { useExpenseTypesQuery } from '@/hooks/useExpenseTypesQuery'
import { useEditableTable } from '@/hooks/useEditableTable'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Spinner } from '@/components/ui/spinner'
import DeleteDialog from '@/components/shared/DeleteDialog'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface BudgetTotals {
  totalBudgeted: number
  totalSpent: number
  totalRemaining: number
}

const money = (n: number) => `${n < 0 ? '-' : ''}₱${formatCurrency(Math.abs(n))}`

// Recompute state locally so it stays live while a budget is being edited.
const budgetPct = (monthlyBudget: number | null, spent: number) =>
  monthlyBudget && monthlyBudget > 0 ? (spent / monthlyBudget) * 100 : 0

const progressColor = (monthlyBudget: number | null, spent: number, pct: number): string => {
  if ((monthlyBudget == null && spent > 0) || (monthlyBudget != null && spent > monthlyBudget)) {
    return 'bg-text-error'
  }
  if (spent > 0 && pct >= 80) return 'bg-brand-gold'
  if (spent > 0) return 'bg-text-success'
  return 'bg-secondary-400'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditableCell = ({ getValue, row, column, table }: any) => {
  const meta = table.options.meta
  const isEditing: boolean = meta?.editedRows[row.id]
  const type: string = column.columnDef.meta?.type
  const cellValue = getValue()
  const [draft, setDraft] = useState(cellValue)

  useEffect(() => {
    setDraft(cellValue)
  }, [cellValue, isEditing])

  if (!isEditing) {
    if (type === 'currency') {
      const hasBudget = cellValue != null && Number(cellValue) > 0
      return (
        <span className="text-numeric text-muted-foreground">
          {hasBudget ? `₱${formatCurrency(Number(cellValue))}` : '—'}
        </span>
      )
    }
    return <span className="font-medium">{cellValue}</span>
  }

  if (type === 'currency') {
    return (
      <CurrencyInput
        className="w-32"
        value={Number(draft) || 0}
        onValueChange={(val) => {
          setDraft(val)
          meta?.updateData(row.original.id, column.id, val === '' ? null : Number(val))
        }}
      />
    )
  }

  return (
    <Input
      value={draft ?? ''}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => meta?.updateData(row.original.id, column.id, draft)}
      className="w-40"
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpentCell = ({ row }: any) => (
  <span className="text-numeric">₱{formatCurrency(row.original.spentAmount)}</span>
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RemainingCell = ({ row }: any) => {
  const b: BudgetStatusItem = row.original
  if (b.monthlyBudget == null) return <span className="text-numeric text-muted-foreground">—</span>
  const remaining = b.monthlyBudget - b.spentAmount
  return (
    <span className={cn('text-numeric', remaining < 0 && 'text-text-error')}>{money(remaining)}</span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProgressCell = ({ row }: any) => {
  const b: BudgetStatusItem = row.original
  if (b.monthlyBudget == null) {
    return <span className="text-xs text-muted-foreground">No budget set</span>
  }
  const pct = budgetPct(b.monthlyBudget, b.spentAmount)
  return (
    <div className="flex items-center gap-2">
      <div className="w-full bg-secondary-400/30 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full', progressColor(b.monthlyBudget, b.spentAmount, pct))}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-numeric text-xs text-muted-foreground shrink-0 w-10 text-right">
        {Math.round(pct)}%
      </span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditActionsCell = ({ row, table }: any) => {
  const meta = table.options.meta
  const isEditing: boolean = meta?.editedRows[row.id]

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta?.setEditedRows((old: any) => ({ ...old, [row.id]: true }))
  }

  const cancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    meta?.revertData(row.original.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta?.setEditedRows((old: any) => ({ ...old, [row.id]: false }))
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    meta?.setBudgetToDelete({ id: row.original.id, name: row.original.name })
    meta?.setDeleteDialogOpen(true)
  }

  const save = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const r: BudgetStatusItem = table.options.data[row.index]
      await meta?.saveBudget(r)
      meta?.clearPendingEdits(r.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      meta?.setEditedRows((old: any) => ({ ...old, [row.id]: false }))
      toast.success('Budget updated', { duration: 4000 })
    } catch (error) {
      toast.error('Failed to update budget', {
        description: error instanceof Error ? error.message : 'Please try again.',
        duration: 6000,
      })
    }
  }

  return isEditing ? (
    <div className="flex gap-1 justify-end">
      <Button variant="ghost" size="icon" onClick={save} disabled={meta?.isUpdating} aria-label="Save">
        {meta?.isUpdating ? <Spinner className="h-4 w-4" /> : <IconCheck className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={cancel} disabled={meta?.isUpdating} aria-label="Cancel">
        <IconX className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={meta?.isUpdating || meta?.isDeleting}
        aria-label="Delete budget"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <div className="flex justify-end">
      <Button variant="ghost" size="icon" onClick={startEdit} aria-label="Edit budget">
        <IconEdit className="h-4 w-4" />
      </Button>
    </div>
  )
}

const columnHelper = createColumnHelper<BudgetStatusItem>()

const columns = [
  columnHelper.accessor('name', { header: 'Category', cell: EditableCell, meta: { type: 'text' } }),
  columnHelper.accessor('monthlyBudget', { header: 'Budgeted', cell: EditableCell, meta: { type: 'currency' } }),
  columnHelper.accessor('spentAmount', { header: 'Spent', cell: SpentCell }),
  columnHelper.display({ id: 'remaining', header: 'Remaining', cell: RemainingCell }),
  columnHelper.display({ id: 'progress', header: 'Progress', cell: ProgressCell }),
  columnHelper.display({ id: 'actions', header: '', cell: EditActionsCell }),
]

const BudgetsTable = ({
  budgets,
  onRowClick,
}: {
  budgets: BudgetStatusItem[]
  onRowClick: (id: string) => void
}) => {
  const { updateBudget, isUpdating, deleteBudget, isDeleting } = useExpenseTypesQuery()
  const { mergedData, editedRows, setEditedRows, updateData, revertData, clearPendingEdits } =
    useEditableTable<BudgetStatusItem>({ queryData: budgets })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<{ id: string; name: string } | null>(null)

  const handleDeleteConfirm = async () => {
    if (!budgetToDelete) return
    const id = budgetToDelete.id
    setDeleteDialogOpen(false)
    setBudgetToDelete(null)
    try {
      await deleteBudget(id)
      toast.success('Budget deleted', { duration: 4000 })
    } catch (error) {
      toast.error('Failed to delete budget', {
        description: error instanceof Error ? error.message : 'Please try again.',
        duration: 6000,
      })
    }
  }

  const totals = mergedData.reduce<BudgetTotals>(
    (acc, b) => {
      if (b.monthlyBudget != null) acc.totalBudgeted += Number(b.monthlyBudget)
      acc.totalSpent += b.spentAmount
      return acc
    },
    { totalBudgeted: 0, totalSpent: 0, totalRemaining: 0 }
  )
  totals.totalRemaining = totals.totalBudgeted - totals.totalSpent
  const overallPct = totals.totalBudgeted > 0
    ? Math.round((totals.totalSpent / totals.totalBudgeted) * 100)
    : 0

  const saveBudget = async (b: BudgetStatusItem) => {
    await updateBudget({
      id: b.id,
      name: b.name,
      monthlyBudget: b.monthlyBudget != null && Number(b.monthlyBudget) > 0 ? String(b.monthlyBudget) : '',
    })
  }

  const table = useReactTable({
    data: mergedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      editedRows,
      setEditedRows,
      updateData,
      revertData,
      clearPendingEdits,
      saveBudget,
      isUpdating,
      isDeleting,
      setDeleteDialogOpen,
      setBudgetToDelete,
    },
  })

  return (
    <>
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn('p-4', header.column.id === 'progress' && 'w-[180px]')}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => {
                if (!editedRows[row.id]) onRowClick(row.original.id)
              }}
              className={cn(!editedRows[row.id] && 'cursor-pointer')}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="p-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t-2 hover:bg-transparent">
            <TableCell className="p-4 font-semibold">Total</TableCell>
            <TableCell className="p-4 text-numeric font-semibold">
              ₱{formatCurrency(totals.totalBudgeted)}
            </TableCell>
            <TableCell className="p-4 text-numeric font-semibold">
              ₱{formatCurrency(totals.totalSpent)}
            </TableCell>
            <TableCell
              className={cn('p-4 text-numeric font-semibold', totals.totalRemaining < 0 && 'text-text-error')}
            >
              {money(totals.totalRemaining)}
            </TableCell>
            <TableCell className="p-4 text-numeric font-semibold text-muted-foreground">
              {overallPct}%
            </TableCell>
            <TableCell className="p-4" />
          </TableRow>
        </TableFooter>
      </Table>
    </div>

    <DeleteDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      onConfirm={handleDeleteConfirm}
      title="Delete budget?"
      description={
        <>
          Deleting <span className="font-semibold">{budgetToDelete?.name}</span> will move its
          transactions to Uncategorized. This can&apos;t be undone.
        </>
      }
      isDeleting={isDeleting}
    />
    </>
  )
}

export default BudgetsTable
