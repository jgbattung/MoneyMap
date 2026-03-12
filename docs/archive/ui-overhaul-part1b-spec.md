# UI/UX Overhaul Part 1B: Completion Sweep

## Overview
Phase 1 established the core design system — card utility classes, desaturated text variables, remapped accent, and typography rules. However, a UI review found that many components were **not migrated** to these new rules. This spec documents every remaining violation and the exact fix required.

## Problem Categories

### A. Saturated Financial Text Colors
The spec mandates that **all financial data text** (amounts showing positive/negative change) must use the desaturated `text-text-success` / `text-text-error` classes against the `#121212` background. Several components still use the saturated brand palette (`text-success-600`, `text-error-600`) or raw Tailwind defaults (`text-green-600`, `bg-green-600`).

> [!IMPORTANT]
> `text-success-600` ≠ `text-text-success`. The former maps to `--color-success-600` (saturated `oklch(0.607 0.129 142.5)`). The latter maps to `--text-success` (desaturated mint `oklch(0.845 0.094 164.1)`). Only the latter passes WCAG AA contrast against `#121212`.

**Components violating this rule:**

| Component | Current | Fix |
|-----------|---------|-----|
| `TotalNetWorthCard.tsx` | `text-success-600` / `text-error-600` for monthly change indicator | → `text-text-success` / `text-text-error` |
| `NetWorthCard.tsx` | `text-success-600` / `text-error-600` for net worth change | → `text-text-success` / `text-text-error` |
| `MonthlySummaryChart.tsx` | `text-success-600` / `text-error-600` for expense/income changes and savings | → `text-text-success` / `text-text-error` |
| `AnnualSummaryTable.tsx` | `text-success-600` for savings row | → `text-text-success` |
| `BudgetStatus.tsx` | Raw `bg-green-600` for progress bar, `bg-gray-400` default | → `bg-success-500` / `bg-secondary-400` |
| `IncomeTypeCard.tsx` | Raw `text-green-600` for target completion | → `text-text-success` |

> [!NOTE]
> Uses of `text-error-600` for **error/failure messages** (e.g., "Failed to load...") and **delete icons** are intentional UI indicators, not financial data text, and should remain unchanged. Similarly, `text-green-600` in `EditExpenseTypeSheet`/`Drawer` checkmark icons are left as-is per Phase 1 notes.

### B. Card Architecture Violations
The spec mandates `.money-map-card-interactive` for clickable cards and `.money-map-card` for static containers. Several cards still use the old inline pattern: `bg-card border border-border rounded-md p-4 shadow-md hover:bg-card/70 hover:scale-105`.

**Interactive cards missing `.money-map-card-interactive`:**

| Component | Anti-patterns present |
|-----------|----------------------|
| `CreditCardCard.tsx` | `shadow-md`, `hover:scale-105`, `rounded-md` instead of `rounded-xl` |
| `TransferCard.tsx` | `shadow-md`, `hover:scale-105`, `rounded-md` instead of `rounded-xl` |
| `IncomeTypeCard.tsx` | `shadow-md`, `hover:scale-105`, `rounded-md` instead of `rounded-xl` |

**Static containers missing `.money-map-card`:**

| Component | Anti-patterns present |
|-----------|----------------------|
| `GroupCard.tsx` | `shadow-md`, `rounded-md` |
| `AnnualSummaryTable.tsx` (×2) | `shadow-md`, `rounded-md`, inline bg/border |
| `ExpenseBreakdownChart.tsx` (×4) | `shadow-md`, `rounded-md`, inline bg/border |
| `NetWorthCard.tsx` (×3) | `shadow-md`, `rounded-md`, inline bg/border |
| `reports/page.tsx` | `shadow-md`, `rounded-md`, inline bg/border |

**Skeleton cards with `shadow-md`:**

| Component | Fix |
|-----------|-----|
| `SkeletonAccountCard.tsx` | → `money-map-card` |
| `SkeletonBudgetCard.tsx` | → `money-map-card` |
| `SkeletonCardCard.tsx` | → `money-map-card` |
| `SkeletonIncomeTypeCard.tsx` | → `money-map-card` |

### C. Existing Tests Requiring Updates
The `BudgetCard.test.tsx` file asserts `text-green-600` and `text-error-600` class names. Since `BudgetCard` was already migrated in Phase 1, these tests may already be correct — but the test referencing `text-green-600` will break if we change `BudgetCard`'s behavior. We must verify this is **not** a financial-data case (it's a budget status indicator), so it stays as-is per Phase 1 notes.

No other test files assert the old color classes for components being changed in this sweep.

---

## Handoff Note for Builder

**Feature:** UI Overhaul Part 1B — Completion Sweep
**Branch name suggestion:** `feature/ui-overhaul-part1b-completion`
**Files most likely to be affected:**
- `src/components/dashboard/TotalNetWorthCard.tsx`
- `src/components/dashboard/MonthlySummaryChart.tsx`
- `src/components/dashboard/AssetCategoriesChart.tsx` (error text only — already fine)
- `src/components/shared/BudgetStatus.tsx`
- `src/components/shared/CreditCardCard.tsx`
- `src/components/shared/TransferCard.tsx`
- `src/components/shared/IncomeTypeCard.tsx`
- `src/components/shared/GroupCard.tsx`
- `src/components/shared/NetWorthCard.tsx`
- `src/components/shared/AnnualSummaryTable.tsx`
- `src/components/shared/ExpenseBreakdownChart.tsx`
- `src/components/shared/SkeletonAccountCard.tsx`
- `src/components/shared/SkeletonBudgetCard.tsx`
- `src/components/shared/SkeletonCardCard.tsx`
- `src/components/shared/SkeletonIncomeTypeCard.tsx`
- `src/app/reports/page.tsx`

**Watch out for:**
- Do NOT change `text-error-600` used in error messages like "Failed to load..." — those are UI indicators, not financial data.
- Do NOT change `text-error-600` on delete/trash icons.
- The `GroupCard` has a non-standard structure with `overflow-hidden` for collapsible content — use `.money-map-card` but keep `overflow-hidden` alongside it.
- `CreditCardCard` has a `relative` class for dropdown positioning — keep it when migrating to `.money-map-card-interactive`.
- `IncomeCard.tsx` was already correctly migrated and should NOT be touched.

**Verification focus:**
- `npm run build` must pass with zero errors
- `npm run lint` must pass with zero warnings
- `npx jest` — all existing unit tests must pass
- Grep for `hover:scale-105` → must return **zero** results in `src/`
- Grep for `text-green-600` → must return zero results in shared components (only in form checkmarks)
- Grep for `bg-green-600` → must return **zero** results in `src/`
- Grep for `shadow-md` in `src/components/shared/` → must return **zero** results
- Visual: hover over CreditCardCard, TransferCard, IncomeTypeCard → subtle ring glow, no layout shift
