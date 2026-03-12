# Dashboard TotalNetWorthCard — UI Polish Spec

## Overview

The `TotalNetWorthCard` is the hero element of the dashboard — it's the first number users see. Currently it's functional but static and lacks the polish expected of a fintech app. This spec covers a focused set of improvements to make it feel premium, accessible, and interactive.

## Current State

- **File:** `src/components/dashboard/TotalNetWorthCard.tsx`
- **Parent:** `src/components/dashboard/NetWorthDisplay.tsx`
- **Hook:** `src/hooks/useNetWorth.ts`
- **Library:** `src/lib/net-worth.ts`

### Issues Identified

1. Net worth value appears instantly with no entrance animation — feels flat
2. Monthly change indicator is plain text with no visual container/badge
3. No `prefers-reduced-motion` support (WCAG requirement, severity: High)
4. No way to hide/show balance for privacy
5. Error state has no retry affordance
6. `formatCurrency` is defined inline in every component (25+ files) — no shared utility
7. Uses `export default` instead of named exports (violates project coding standards)

## Scope

### In Scope

- Animated count-up for the net worth value (using `framer-motion`, already installed)
- Monthly change pill/badge with tinted background
- `prefers-reduced-motion` media query support
- Eye toggle to hide/reveal the balance
- Error state with retry button
- Extract shared `formatCurrency` utility to `src/lib/format.ts`
- Convert to named exports

### Out of Scope

- Changes to `NetWorthDisplay.tsx` layout or `NetWorthHistoryChart`
- Changes to the `useNetWorth` hook or `/api/net-worth` endpoint
- Changes to `src/lib/net-worth.ts` server logic
- Migrating all 25 other components to use the shared `formatCurrency` (future task)

## Detailed Requirements

### A. Shared `formatCurrency` Utility

Create `src/lib/format.ts` with:

```ts
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

This is the exact same logic currently inlined in `TotalNetWorthCard`. For this spec, only `TotalNetWorthCard` will be migrated to use it. Other components can be migrated in a future sweep.

### B. Animated Count-Up

Use `framer-motion`'s `useSpring` and `useTransform` to animate the displayed number from 0 to the actual value:

- Duration: ~800ms
- Easing: ease-out (natural deceleration)
- Trigger: on initial data load and when `netWorth` value changes
- The animated value must pass through `formatCurrency` on every frame
- Must respect `prefers-reduced-motion` — if reduced motion is preferred, show the value instantly with no animation

### C. Monthly Change Pill/Badge

Wrap the monthly change indicator in a pill-shaped badge:

- Positive: `bg-text-success/10 text-text-success` with rounded-full padding
- Negative: `bg-text-error/10 text-text-error` with rounded-full padding
- Neutral: `bg-secondary-400/10 text-secondary-400` with rounded-full padding
- Remove the redundant `+`/`-` text prefix — the arrow icon already conveys direction
- Keep the arrow icon + amount + percentage format

### D. Balance Privacy Toggle

Add an eye icon button next to the "Total Net Worth" label:

- Default state: balance visible (Eye icon)
- Toggled state: balance hidden, show `*****` (EyeOff icon)
- When hidden, both the main net worth value AND the monthly change amount should be masked
- Use `lucide-react` icons: `Eye` and `EyeOff`
- Toggle state is local (no persistence needed for now)
- The toggle button must have `cursor-pointer` and an `aria-label`

### E. Error State with Retry

Improve the error state:

- Add an `AlertCircle` icon from `lucide-react` above the error message
- Add a "Try again" button that calls the `refetch` function from React Query
- This requires exposing `refetch` from the `useNetWorth` hook

### F. Named Exports

- Change `export default TotalNetWorthCard` to `export { TotalNetWorthCard }`
- Update the import in `NetWorthDisplay.tsx` accordingly
- Change `export default NetWorthDisplay` to `export { NetWorthDisplay }`
- Update any imports of `NetWorthDisplay` accordingly

### G. Skeleton Loading Improvements

- Add a skeleton pill for the monthly change badge area (matching the new pill shape)
- Ensure skeleton layout matches the real content layout closely

---

## Handoff Note for Builder

**Feature:** Dashboard TotalNetWorthCard UI Polish
**Branch name suggestion:** `feature/dashboard-networth-card-polish`
**Files most likely to be affected:**
- `src/lib/format.ts` (new file)
- `src/components/dashboard/TotalNetWorthCard.tsx`
- `src/components/dashboard/NetWorthDisplay.tsx`
- `src/hooks/useNetWorth.ts` (expose `refetch`)

**Watch out for:**
- `framer-motion` is already in `package.json` — do NOT install it again
- The `useNetWorth` hook currently does not expose `refetch`. You need to add it to the return value.
- The `prefers-reduced-motion` check can use `framer-motion`'s `useReducedMotion()` hook or a manual `window.matchMedia` check.
- The monthly change badge colors use the design system tokens (`text-text-success`, `text-text-error`) established in the Phase 1 overhaul — do NOT use raw Tailwind colors.
- Do not change the error state's `text-error-600` class — it's a UI indicator, not financial data text.

**Verification focus:**
- `npm run build` must pass with zero errors
- `npm run lint` must pass
- Count-up animation plays on load, respects `prefers-reduced-motion`
- Eye toggle hides/reveals balance and monthly change
- Error state shows retry button that re-fetches data
- Monthly change displays as a colored pill badge
- No regressions in `NetWorthDisplay` or dashboard layout
