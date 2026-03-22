# Hotfix: Sticky Header Bugs — Spec

## Overview

Two related bugs in the `PageHeader` component and its consumers:

1. **Actions stick with header** — On the Accounts and Cards pages, the action buttons (Add account / Add credit card) are rendered inside the sticky wrapper, so they pin to the top of the viewport on scroll instead of scrolling away with the page content.
2. **Transactions header is not sticky** — The Transactions page wraps `PageHeader` in a `<div className="mb-6">` that prevents `position: sticky` from working. The sticky element is confined to a wrapper the same height as itself, so it scrolls away.

Both bugs stem from the header-polish implementation (PR #126). The fixes are surgical and do not change any public component interface.

---

## Root Cause Analysis

### Bug 1 — Actions inside sticky boundary

**File:** `src/components/shared/PageHeader.tsx`

The entire component output is a single `<div className="sticky top-0 z-10 ...">`. Both the title row (Row 1) and the actions slot (Row 2) live inside this div. Because the div is sticky, everything in it pins to the viewport top on scroll.

The original header-polish spec intended the actions to sit below the divider as a "second row," but it did not specify that only Row 1 should be sticky. The implementation placed both rows inside one sticky container.

**Desired behavior:** Only the title row (with its bottom border) should be sticky. The actions slot should scroll normally with page content.

### Bug 2 — Wrapper div breaks sticky

**File:** `src/app/transactions/page.tsx`

```tsx
<div className="mb-6">        <!-- this wrapper breaks sticky -->
  <PageHeader title="Transactions" />
</div>
```

CSS `position: sticky` positions the element relative to its nearest scrolling ancestor, but the element can never leave the bounds of its containing block. The `<div className="mb-6">` containing block is exactly the height of the PageHeader, so there is zero scroll distance available — the header scrolls away with its parent.

Every other page (Dashboard, Accounts, Cards, etc.) renders `PageHeader` as a direct child of the page container without a wrapper, and sticky works correctly there.

**Desired behavior:** Remove the wrapper so `PageHeader` is a direct child of the scrollable container, matching all other pages.

---

## Affected Files

| File | Change | Bug |
|------|--------|-----|
| `src/components/shared/PageHeader.tsx` | Split into sticky part (title row) and non-sticky part (actions slot) | Bug 1 |
| `src/app/transactions/page.tsx` | Remove wrapping `<div className="mb-6">` around `PageHeader` | Bug 2 |

**No other files are affected.** The `PageHeaderProps` interface (`title: string; actions?: React.ReactNode`) is unchanged. All 11 consumer pages continue to work without modification.

---

## Implementation Details

### Task 1 — Fix PageHeader sticky boundary

**Current structure:**

```tsx
<div className="sticky top-0 z-10 bg-background pt-6 mb-3 md:mb-5">
  {/* Row 1 */}
  <div className="flex items-center justify-between pb-4 border-b border-border">
    <h1>...</h1>
    <UserMenu />
  </div>
  {/* Actions (inside sticky — BUG) */}
  {actions && (
    <div className="flex justify-end mt-4">{actions}</div>
  )}
</div>
```

**Target structure:**

```tsx
<>
  {/* Sticky: title row only */}
  <div className="sticky top-0 z-10 bg-background pt-6">
    <div className="flex items-center justify-between pb-4 border-b border-border">
      <h1>...</h1>
      <UserMenu />
    </div>
  </div>
  {/* Non-sticky: actions + spacing */}
  {actions && (
    <div className="flex justify-end mt-4 mb-3 md:mb-5">{actions}</div>
  )}
  {/* Spacing when there are no actions */}
  {!actions && <div className="mb-3 md:mb-5" />}
</>
```

Key changes:
- The sticky div now wraps only the title row. The `mb-3 md:mb-5` bottom margin moves out of the sticky div.
- The actions div is rendered outside and below the sticky div, so it scrolls normally.
- When there are no actions, a simple spacer div provides the same `mb-3 md:mb-5` gap that was previously on the sticky wrapper.
- The component return changes from a single div to a Fragment (`<>...</>`).

### Task 2 — Fix Transactions page wrapper

**Current:**
```tsx
<div className="mb-6">
  <PageHeader title="Transactions" />
</div>
```

**Target:**
```tsx
<PageHeader title="Transactions" />
```

The `mb-6` spacing is unnecessary because `PageHeader` already provides `mb-3 md:mb-5` bottom spacing. Removing the wrapper restores sticky behavior.

---

## Verification Plan

For each task, the Builder should verify:

1. **Lint passes** — `npm run lint` returns zero errors.
2. **Build passes** — `npm run build` completes without errors.
3. **Manual checks** (documented in verification file):
   - Transactions page: PageHeader sticks to top on scroll.
   - Accounts page: Title row sticks, action buttons scroll away.
   - Cards page: Title row sticks, action buttons scroll away.
   - Dashboard page (regression): PageHeader still sticks correctly (no actions).

---

## Out of Scope

- No changes to `MobileDetailHeader` or detail pages.
- No changes to the `PageHeaderProps` interface.
- No design or styling changes beyond moving the sticky boundary.
- No new components or files.

---

## Handoff Note

Builder: this is a two-task hotfix. Read this spec fully before starting. The changes are small but the sticky CSS behavior is subtle — make sure the Fragment wrapper and spacing logic are correct before committing. Run lint and build after each task. Branch name: `fix/sticky-header`.
