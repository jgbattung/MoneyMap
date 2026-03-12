# Dashboard Widgets UI Polish — AssetCategoriesChart & BudgetStatus

## Executive Summary

The `AssetCategoriesChart` and `BudgetStatus` are two key dashboard widgets that remain unpolished after the global UI overhaul (Part 1) and the TotalNetWorthCard polish pass. They still use old saturated color tokens, lack micro-interactions, have no accessibility support, and don't follow the project's named-export convention. This spec brings them up to the same standard established by the TotalNetWorthCard polish.

## Detailed Analysis

### AssetCategoriesChart — Current State

- **File:** `src/components/dashboard/AssetCategoriesChart.tsx`
- **Parent:** `src/components/dashboard/NetWorthInsights.tsx`
- **Hook:** `src/hooks/useAccountsQuery.ts`
- **Data util:** `src/lib/utils.ts` → `calculateAssetCategories()`

#### Issues

1. Segmented bar has no tooltips — users can't see exact amounts or percentages without scanning the legend
2. No entrance animation on the segmented bar — appears instantly, feels static
3. No `prefers-reduced-motion` support (WCAG, severity: High)
4. Error state has no retry affordance — dead-end message
5. `useAccountsQuery` does not expose `refetch` — needed for retry
6. No currency amounts shown in legend — only percentages
7. Bar segments lack `cursor-pointer` for hover interaction
8. Uses `export default` instead of named export (violates coding standards)

### BudgetStatus — Current State

- **File:** `src/components/shared/BudgetStatus.tsx`
- **Parent:** `src/app/dashboard/page.tsx`
- **Hook:** `src/hooks/useBudgetStatus.ts`

#### Issues

1. Uses old saturated color tokens: `bg-success-500`, `bg-error-500` instead of the design system's desaturated `bg-text-success`, `bg-text-error`
2. Inline `formatCurrency` instead of using shared `src/lib/format.ts`
3. Progress bars appear instantly — no entrance animation
4. No `prefers-reduced-motion` support (WCAG, severity: High)
5. No warning color for budgets at 80–99% — they look the same as healthy budgets
6. No summary insight (e.g., "3 of 5 budgets on track")
7. Error state has no retry affordance
8. `useBudgetStatus` does not expose `refetch`
9. "See All Budgets" button uses `hover:text-white` — not in the design system
10. No percentage text shown on individual budget items
11. Uses `export default` instead of named export (violates coding standards)

### Design Research (ui-ux-pro-max findings)

| Finding | Source | Impact |
|---------|--------|--------|
| Stacked bars are more accessible than pie/donut charts | `chart` domain — Part-to-Whole | Validates the current segmented bar approach; no need to switch to donut |
| Tooltips with hover data improve chart comprehension | `chart` domain — Hover + Drill | AssetCategories needs tooltips on bar segments |
| Progress bars need numerical labels alongside the visual | `ux` domain — Feedback | BudgetStatus should show percentage text |
| `prefers-reduced-motion` is High severity | `ux` domain — Animation | Both components lack this entirely |
| Animate 1–2 key elements max per view | `ux` domain — Excessive Motion | Keep animations targeted: bar entrance + progress bars only |
| Use `ease-out` for entering, `ease-in` for exiting | `ux` domain — Easing Functions | Apply to bar and progress bar entrance animations |
| Shadcn has `Progress`, `Badge`, `Tooltip` components | `shadcn` stack | Use Radix Tooltip instead of raw `title` attribute |
| `cursor-pointer` on all interactive elements | Pre-delivery checklist | Missing on segmented bar segments |

### What NOT To Do

- **Do NOT use pie/donut charts** — the ui-ux-pro-max chart domain flags them as poor for accessibility when categories exceed 5. The current stacked bar is the correct choice.
- **Do NOT use `animate-bounce` or scale transforms** — the UX guidelines flag excessive motion (severity: High). Use width transitions only.
- **Do NOT use `linear` easing** — feels robotic. Use `ease-out` for entering animations.
- **Do NOT use the old saturated `bg-success-500` / `bg-error-500`** — these vibrate against the dark background. Use the desaturated `bg-text-success` / `bg-text-error` tokens.
- **Do NOT install `@vitejs/plugin-react`** — this conflicts with the test setup (documented in CLAUDE.md).

## Scope

### In Scope

**AssetCategoriesChart:**
- A. Radix Tooltips on each bar segment (category name, ₱ amount, percentage)
- B. Animated bar entrance (segments grow from 0% width) with `prefers-reduced-motion` support
- C. Error state with `AlertCircle` icon + retry button
- D. Show ₱ amounts alongside percentages in the legend
- E. `cursor-pointer` on hoverable bar segments
- F. Convert to named export; update `NetWorthInsights.tsx` import

**BudgetStatus:**
- G. Replace inline `formatCurrency` with shared `src/lib/format.ts`
- H. Migrate progress bar colors to design system tokens (`bg-text-success`, `bg-text-error`)
- I. Add warning color (amber) for budgets at 80–99% spent
- J. Animated progress bars (grow from 0% on mount) with `prefers-reduced-motion` support
- K. Add summary line: "X of Y budgets on track"
- L. Error state with `AlertCircle` icon + retry button
- M. Fix "See All Budgets" button hover to use design system tokens
- N. Show percentage text on each budget item
- O. Convert to named export; update `dashboard/page.tsx` import

**Hooks:**
- P. Expose `refetch` from `useAccountsQuery`
- Q. Expose `refetch` from `useBudgetStatus`

### Out of Scope

- Changes to `calculateAssetCategories` logic in `src/lib/utils.ts`
- Changes to API routes or database queries
- Migrating other components to use shared `formatCurrency`
- Changes to `NetWorthInsights.tsx` layout or `MonthlySummaryChart`
- Changes to `NetWorthSection` or `TotalNetWorthCard`

## Requirements

### A. Tooltips on Bar Segments (AssetCategoriesChart)

Add Radix `Tooltip` (from `src/components/ui/tooltip.tsx`) to each segment of the segmented bar:
- Tooltip content: `{Category Name}: ₱{formatCurrency(amount)} ({percentage}%)`
- Use shared `formatCurrency` from `src/lib/format.ts`
- Each segment must have `cursor-pointer` class
- Shadcn's Tooltip wraps its own TooltipProvider — no extra setup needed

### B. Animated Bar Entrance (AssetCategoriesChart)

Use `framer-motion`'s `motion.div` to animate each bar segment:
- Animate from `width: "0%"` to `width: "{percentage}%"`
- Duration: 500ms, ease-out easing
- Stagger each segment by ~50ms delay
- Respect `prefers-reduced-motion` via `useReducedMotion()` — if true, render at full width instantly with no animation
- Keep `transition-opacity hover:opacity-80` for hover interaction

### C. Error State with Retry (AssetCategoriesChart)

Replace the current plain error div:
- `AlertCircle` icon from `lucide-react` (`h-8 w-8 text-error-600`)
- Keep existing error message text
- Add "Try again" button: `cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors`
- Calls `refetch()` from `useAccountsQuery`

### D. Currency Amounts in Legend (AssetCategoriesChart)

Update legend to show amount alongside percentage:
- Current: `Savings` / `45.2%`
- New: `Savings` / `₱{formatCurrency(value)}` / `{percentage}%`
- The `value` field already exists on the category objects returned by `calculateAssetCategories`

### E. Cursor Pointer on Segments (AssetCategoriesChart)

Add `cursor-pointer` class to each bar segment div.

### F. Named Export (AssetCategoriesChart)

- Change `export default AssetCategoriesChart` to `export { AssetCategoriesChart }`
- Update `NetWorthInsights.tsx`: `import AssetCategoriesChart from './AssetCategoriesChart'` → `import { AssetCategoriesChart } from './AssetCategoriesChart'`

### G. Shared formatCurrency (BudgetStatus)

- Remove the inline `formatCurrency` function from `BudgetStatusItem`
- Import `{ formatCurrency }` from `@/lib/format`

### H. Migrate Colors to Design System Tokens (BudgetStatus)

Replace old saturated colors in the progress bar color logic:

| Old Token | New Token | Condition |
|-----------|-----------|-----------|
| `bg-success-500` | `bg-text-success` | Spending within budget, < 80% |
| `bg-error-500` | `bg-text-error` | Over budget OR spending without budget set |
| `bg-secondary-400` | `bg-secondary-400` | No spending (unchanged) |
| _(new)_ | `bg-amber-400` | Warning: 80–99% of budget spent |

Progress bar track: keep `bg-secondary-400/30`.

### I. Warning Color State (BudgetStatus)

New color logic branch:
- `progressPercentage >= 80 && !isOverBudget && spentAmount > 0` → `bg-amber-400`
- This gives users a visual heads-up before exceeding their budget

### J. Animated Progress Bars (BudgetStatus)

Use `framer-motion`'s `motion.div` for the progress bar fill:
- Animate from `width: "0%"` to `width: "{progressWidth}%"`
- Duration: 500ms, ease-out easing
- Respect `prefers-reduced-motion` via `useReducedMotion()` — if true, render at full width instantly
- Note: `useReducedMotion` must be called in the parent `BudgetStatus` component and passed as a prop to `BudgetStatusItem` (hooks cannot be called conditionally in list items)

### K. Budget Summary Line (BudgetStatus)

Add a subtitle below the header row:
- Text: `"{onTrackCount} of {totalCount} budgets on track"`
- "On track" = not over budget AND has a budget set
- Style: `text-xs text-muted-foreground`
- Only render when there are budgets (not in loading/error/empty states)

### L. Error State with Retry (BudgetStatus)

Update the `ErrorState` component:
- Add `AlertCircle` icon (`h-8 w-8 text-error-600`)
- Keep existing error messages
- Add "Try again" button matching the pattern from `TotalNetWorthCard`
- Accept `refetch` as a prop, call it on click

### M. Fix Button Hover (BudgetStatus)

Remove `hover:text-white` from the "See All Budgets" button. The Shadcn `outline` variant already handles hover via `hover:bg-accent hover:text-accent-foreground`.

### N. Percentage Text on Budget Items (BudgetStatus)

Show progress percentage alongside the spent amount:
- When budget is set: add `{progressPercentage}%` as inline text after the "out of" line
- Style: `text-xs text-muted-foreground`

### O. Named Export (BudgetStatus)

- Change `export default BudgetStatus` to `export { BudgetStatus }`
- Update `dashboard/page.tsx`: `import BudgetStatus from '@/components/shared/BudgetStatus'` → `import { BudgetStatus } from '@/components/shared/BudgetStatus'`

### P. Expose refetch from useAccountsQuery

Edit `src/hooks/useAccountsQuery.ts`:
- Destructure `refetch` from `useQuery` return value
- Add `refetch` to the hook's return object

### Q. Expose refetch from useBudgetStatus

Edit `src/hooks/useBudgetStatus.ts`:
- Destructure `refetch` from `useQuery` return value
- Add `refetch` to the hook's return object

---

## Handoff Note for Builder

**Feature:** Dashboard Widgets UI Polish (AssetCategoriesChart & BudgetStatus)
**Branch name suggestion:** `feature/dashboard-widgets-polish`
**Files most likely to be affected:**
- `src/components/dashboard/AssetCategoriesChart.tsx` (major changes)
- `src/components/dashboard/NetWorthInsights.tsx` (import update)
- `src/components/shared/BudgetStatus.tsx` (major changes)
- `src/app/dashboard/page.tsx` (import update)
- `src/hooks/useAccountsQuery.ts` (expose `refetch`)
- `src/hooks/useBudgetStatus.ts` (expose `refetch`)

**Watch out for:**
- `framer-motion` is already installed — do NOT install it again
- `useReducedMotion()` from `framer-motion` returns `boolean | null` — treat null as false
- Shadcn's Tooltip wraps its own TooltipProvider, so no extra provider setup needed
- Design system tokens: `text-text-success` / `text-text-error` for text; `bg-text-success` / `bg-text-error` for backgrounds
- `amber-400` is available in standard Tailwind — no config changes needed
- Do NOT change `text-error-600` in error states — it's a UI indicator, not financial data text
- `calculateAssetCategories` returns objects with a `value` field (₱ amount) — use it for tooltip and legend amounts
- `useReducedMotion` is a hook — it must be called in `BudgetStatus` (parent) and passed down as a prop to `BudgetStatusItem`, not called inside the list item

**Verification focus:**
- `npm run build` passes with zero errors
- `npm run lint` passes with zero errors
- Bar segments show Radix tooltips on hover with ₱ amounts
- Bar entrance animation plays on load, skipped with `prefers-reduced-motion`
- Progress bars animate on load, skipped with `prefers-reduced-motion`
- Budget items at 80–99% show amber/warning color
- Error states show `AlertCircle` + "Try again" button in both components
- "See All Budgets" button no longer flashes white on hover
- Summary line shows correct on-track count
- No regressions in dashboard layout
