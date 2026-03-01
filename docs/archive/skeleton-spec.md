# Skeleton Loading Spec (Skipped)

## 1. Objectives & Scope
**Objective:** Improve *perceived performance* when navigating between pages by implementing Next.js `loading.tsx` files.
**Scope:**
- Create generic, reusable Skeleton base components in `src/components/ui/` (if Shadcn `<Skeleton />` doesn't exist yet, generate it).
- Create a `loading.tsx` file for every major top-level route under `src/app/` (Dashboard, Accounts, Cards, Budgets, Expenses, Income, Transfers, Reports, etc.).
- Ensure the `loading.tsx` uses the UI skeleton components to display a fast, immediate placeholder before data arrives.
- **Out of Scope:** Prefetching data on hover, or replacing `NextjsTopLoader`. Both can coexist safely.

## 2. Actionable Implementation Steps

### A. Setup Shadcn Skeleton
- **Problem:** Need a standard way to show pulsating placeholders.
- **Action:** If `src/components/ui/skeleton.tsx` doesn't exist, create it (standard shadcn/ui skeleton using `animate-pulse`). If it exists, use it.

### B. Create Page-Specific Skeletons (`loading.tsx`)
- **Action:** For the major routes listed below, create a `loading.tsx` file right next to the `page.tsx`. 
- **Design Rules:** The `loading.tsx` should export a default function. It should return a layout that roughly mimics the actual page structure (e.g., a header skeleton, a few card skeletons for stats, and a large rectangle skeleton for lists/charts). 
- **Target Routes:**
  - `src/app/dashboard/`
  - `src/app/accounts/`
  - `src/app/cards/`
  - `src/app/budgets/`
  - `src/app/expenses/`
  - `src/app/income/`
  - `src/app/transfers/`
  - `src/app/reports/`

## 3. Verification Plan
- User must be able to click a link in the sidebar, e.g., to `/accounts`, and instantly see a skeleton loader rather than waiting for the page to navigate.
- Claude Code MUST output a verification document `docs/skeleton-verification.md` confirming which routes had `loading.tsx` files added.
