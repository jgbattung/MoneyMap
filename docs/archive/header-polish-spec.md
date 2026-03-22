# Header Polish — Spec

## Overview

Two focused layout improvements to the app's header system:

1. **PageHeader two-row layout** — Move the `actions` slot from the same row as `UserMenu` to a dedicated second row (right-aligned), so the page title and user identity are visually separated from page-specific CTAs.
2. **Detail page mobile header** — Replace the back-link currently embedded inside the gradient card on account/card/card-group detail pages with a proper mobile-only header above the gradient card (back icon left, page section title center, nothing right).

---

## Affected Files

### Change 1 — PageHeader

| File | Change |
|------|--------|
| `src/components/shared/PageHeader.tsx` | Restructure to two rows; add divider |

**11 consumer pages** — no JSX changes needed (the `actions` prop interface is unchanged):
- `src/app/accounts/page.tsx`
- `src/app/cards/page.tsx`
- `src/app/expenses/page.tsx`
- `src/app/income/page.tsx`
- `src/app/transfers/page.tsx`
- `src/app/budgets/page.tsx`
- `src/app/reports/page.tsx`
- `src/app/transactions/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/more/page.tsx`
- `src/app/dashboard/page.tsx`

### Change 2 — Detail page mobile header

| File | Change |
|------|--------|
| `src/app/accounts/[id]/page.tsx` | Add mobile header above gradient card; remove back-link from inside gradient card |
| `src/app/cards/[id]/page.tsx` | Same |
| `src/app/cards/groups/[groupName]/page.tsx` | Same |

---

## Design Decisions

### PageHeader — Two-row layout

```
┌────────────────────────────────────────────────────────────┐
│  Page Title                      [Avatar · Name · Email ▾] │
│                                          [+ Add action btn] │
├────────────────────────────────────────────────────────────┤  ← divider
│  (page content)                                            │
```

- Row 1: `h1` title (left) + `UserMenu` (right). Always present.
- Row 2: `actions` slot rendered right-aligned. Only rendered when `actions` is provided.
- A `<Separator />` (or `border-b`) appears below the two-row block, above page content.
- Applies on **all screen sizes** (mobile and desktop).
- The `actions` prop interface on `PageHeaderProps` is **unchanged** — all 11 consumer pages work without modification.

### Detail page mobile header

```
[ ← ]         Accounts          (empty)
┌────────────────────────────────────────────────────────────┐
│  gradient card (untouched — no back-link inside)           │
└────────────────────────────────────────────────────────────┘
```

- A new `MobileDetailHeader` component in `src/components/shared/MobileDetailHeader.tsx`.
- Props: `backHref: string`, `title: string`.
- Layout: `flex items-center relative` — back icon (`ArrowLeft`) absolutely-left, title absolutely-centered.
- **Mobile-only** via `md:hidden` on the wrapper.
- **Transparent background**, no divider (gradient card provides natural separation).
- Back icon links to the explicit `backHref` (no `router.back()` — consistent with existing pattern).
- Rendered above the gradient card in the happy-path `return` block of each detail page.
- The existing back-link inside the gradient card's mobile layout is **removed**.

---

## Component Interface

### `MobileDetailHeader`

```tsx
interface MobileDetailHeaderProps {
  backHref: string;
  title: string;
}
```

Usage on each detail page:
- `accounts/[id]` → `backHref="/accounts"`, `title="Accounts"`
- `cards/[id]` → `backHref="/cards"`, `title="Cards"`
- `cards/groups/[groupName]` → `backHref="/cards"`, `title="Cards"`

---

## Out of Scope

- No changes to skeleton/loading/error states in detail pages (back navigation not present there anyway — user can always use browser back during loading).
- No changes to desktop layouts on detail pages.
- No settings page for UserMenu (placeholder link already exists, no wiring needed).
