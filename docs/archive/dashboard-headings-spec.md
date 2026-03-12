# Dashboard Headings UI Polish

## Executive Summary

The Dashboard components currently use inconsistent HTML tags (`<p>`, `<h2>`) and varying utility classes (`font-light`, `font-semibold`, `text-sm`, `text-lg`) for their main titles. This spec standardizes these headings to improve visual hierarchy, consistency, and accessibility (WCAG AA). 

Based on the `ui-ux-pro-max` design system recommendations for a "Clean Elegant" finance dashboard, we will standardize all widget headings to use proper semantic `<h2>` tags with a unified Tailwind typography class, while allowing the primary `TotalNetWorthCard` to stand out slightly as the hero widget.

## Detailed Analysis

### Current State

| Component | Current Tag | Current Classes |
|-----------|-------------|-----------------|
| `AccountsSummary` | `<h2>` | `text-lg font-semibold` |
| `AssetCategoriesChart` | `<p>` | `text-foreground font-semibold text-sm md:text-base` |
| `MonthlySummaryChart` | `<p>` | `text-foreground font-semibold text-sm md:text-base` |
| `NetWorthHistoryChart` | `<p>` | `text-foreground font-light text-sm md:text-base mt-6` |
| `RecentTransactions` | `<p>` | `text-foreground font-semibold text-sm md:text-base` |
| `TotalNetWorthCard` | `<p>` | `text-foreground font-light text-lg md:text-xl` |

#### Issues

1. **Semantic HTML:** Most components use `<p>` tags for what are structurally section headings. This is poor for accessibility (screen readers).
2. **Visual Inconsistency:** Font weights vary from `font-light` to `font-semibold`. Font sizes vary from `text-sm` to `text-xl`.
3. **No tracking control:** Missing `tracking-tight` which is typical for modern, clean UI headings.

### Design Research (ui-ux-pro-max findings)

| Finding | Source | Impact |
|---------|--------|--------|
| Clean, High Contrast Typography | `style` domain — Dashboard Clean | Standardize on bold, readable fonts |
| Semantic HTML | `web` domain — Accessibility | Migrate to `<h2>` for section titles |

## Scope

### In Scope

- A. Standardize regular widget headings (`AccountsSummary`, `AssetCategoriesChart`, `MonthlySummaryChart`, `NetWorthHistoryChart`, `RecentTransactions`) to `<h2 className="text-lg font-semibold text-foreground tracking-tight">`
- B. Standardize hero widget heading (`TotalNetWorthCard`) to `<h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">`
- C. Ensure any spacing adjustments (like `mt-6`) are maintained where applicable (e.g. `NetWorthHistoryChart`).

### Out of Scope

- Changes to sub-headings or body text inside the components.
- Structural layout changes.

## Requirements

### A. Standardize Widget Headings
Update the heading element in the following files:
- `src/components/dashboard/AccountsSummary.tsx`
- `src/components/dashboard/AssetCategoriesChart.tsx`
- `src/components/dashboard/MonthlySummaryChart.tsx`
- `src/components/dashboard/RecentTransactions.tsx`

**From:** (various `<p>` and `<h2>` tags)
**To:** `<h2 className="text-lg font-semibold text-foreground tracking-tight">`

### B. Maintain Specific Spacing
In `src/components/dashboard/NetWorthHistoryChart.tsx`
**From:** `<p className='text-foreground font-light text-sm md:text-base mt-6'>`
**To:** `<h2 className='text-lg font-semibold text-foreground tracking-tight mt-6'>`

### C. Hero Widget Heading
In `src/components/dashboard/TotalNetWorthCard.tsx`
**From:** `<p className='text-foreground font-light text-lg md:text-xl'>`
**To:** `<h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">`

---

## Handoff Note for Builder

**Feature:** Dashboard Headings UI Polish
**Branch name suggestion:** `feature/dashboard-headings-polish`
**Files most likely to be affected:**
- `src/components/dashboard/AccountsSummary.tsx`
- `src/components/dashboard/AssetCategoriesChart.tsx`
- `src/components/dashboard/MonthlySummaryChart.tsx`
- `src/components/dashboard/NetWorthHistoryChart.tsx`
- `src/components/dashboard/RecentTransactions.tsx`
- `src/components/dashboard/TotalNetWorthCard.tsx`

**Watch out for:**
- Some test files (`.test.tsx`) might fail if they are querying elements by role or text. If tests break after changing `<p>` to `<h2>`, update the test queries appropriately.
- Ensure the `mt-6` class remains on `NetWorthHistoryChart` heading.
