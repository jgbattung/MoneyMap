# Dashboard Redesign Spec

> Shared PageHeader component, UserMenu with session-based avatar, mobile hero summary cards, and back navigation on detail pages.

## Objective

Introduce four foundational improvements that standardize the header pattern across all list pages, centralize user account actions, surface key monthly metrics on mobile without scrolling, and add explicit back navigation on detail sub-pages. This is Tier 1 Feature #2 from the roadmap.

## Scope

### In Scope

- New shared component: `src/components/shared/PageHeader.tsx`
- New shared component: `src/components/shared/UserMenu.tsx`
- New component: `src/components/dashboard/MobileHeroSummary.tsx`
- New placeholder page: `src/app/settings/page.tsx`
- Refactor all ~10 list pages to use `PageHeader`
- Remove user section from Sidebar
- Remove standalone logout button from dashboard page
- Hide `MonthlySummaryChart` on mobile when hero is present
- Add mobile back links on 3 detail sub-pages

### Out of Scope

- Search bar or global search
- Hamburger menu or mobile drawer navigation
- Sticky/fixed header behavior
- Detail page header redesign (gradient cards remain as-is)
- Database changes
- Settings page functionality (placeholder only)

---

## Phase 1: PageHeader Component

### Motivation

Every list page duplicates the same `<h1>` pattern with identical Tailwind classes (`text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold`). Some pages wrap this in a flex row with action buttons, others do not. This duplication makes future header changes (e.g., adding the UserMenu) require touching ~10 files.

### Component API

**File:** `src/components/shared/PageHeader.tsx`

```typescript
interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | The page title rendered as `<h1>` |
| `actions` | `React.ReactNode` | No | Right-side content (buttons, etc.). Rendered as-is. |

### Rendering

```
<div className="flex items-center justify-between flex-wrap gap-4">
  <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">
    {title}
  </h1>
  {actions && <div className="flex items-center gap-2">{actions}</div>}
</div>
```

Key decisions:
- The `<h1>` classes match the existing pattern exactly -- no visual change on initial rollout.
- The `actions` prop is a raw `ReactNode`, not a structured API. This keeps the component simple and avoids over-abstraction. Each page passes its own buttons (Sheet/Drawer triggers, etc.) as children.
- The outer `div` uses `flex-wrap gap-4` to handle narrow viewports where actions wrap below the title.
- The component does NOT include any page-level padding or `max-w-7xl` container. Those remain in each page's own layout div.
- The component does NOT handle sub-pages (detail pages keep their gradient cards).

### Pages to Refactor

Each page currently has an inline `<h1>` (and sometimes action buttons) that will be replaced with `<PageHeader>`. The action buttons (Sheet/Drawer triggers) remain in each page but are passed as the `actions` prop.

| # | Page | File | Has Actions | Notes |
|---|------|------|-------------|-------|
| 1 | Dashboard | `src/app/dashboard/page.tsx` | No (after Phase 2 removes logout button) | Currently has a mobile logout button; that gets removed in Phase 2. In Phase 1, replace h1 + wrapper div with `<PageHeader title="Dashboard" />`. Leave the logout button removal for Phase 2. |
| 2 | Accounts | `src/app/accounts/page.tsx` | Yes (Add account -- Sheet + Drawer) | Pass both desktop/mobile add-account buttons as `actions`. |
| 3 | Cards | `src/app/cards/page.tsx` | Yes (Add credit card -- Sheet + Drawer) | Same pattern as Accounts. |
| 4 | Expenses | `src/app/expenses/page.tsx` | Yes (Add expense -- Sheet + Drawer) | Same pattern. |
| 5 | Income | `src/app/income/page.tsx` | Yes (Add income category -- Sheet + Drawer) | Same pattern. |
| 6 | Budgets | `src/app/budgets/page.tsx` | Yes (Add budget -- Sheet + Drawer) | Same pattern. |
| 7 | Transfers | `src/app/transfers/page.tsx` | No | Standalone `<h1>` without a wrapper div. Wrap in `<PageHeader title="Transfers" />`. |
| 8 | Transactions | `src/app/transactions/page.tsx` | No | Has `mb-6` on the h1; move that margin to the parent or content below. |
| 9 | Reports | `src/app/reports/page.tsx` | No | Has wrapper div with no actions. |
| 10 | More | `src/app/more/page.tsx` | No | Has a different h1 class (`text-2xl font-semibold` only, no responsive sizes) and a subtitle `<p>`. Keep the subtitle below PageHeader as a separate element. Update the h1 to use the standard responsive classes via PageHeader. |

### Action Button Pattern

The existing pattern for action buttons on pages with create actions is:

```tsx
{/* Desktop button */}
<button
  onClick={() => setCreateSheetOpen(true)}
  className="hidden md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-base transition-all"
>
  <Icons.createAccount size={20} />
  <span>Add [resource]</span>
</button>

{/* Mobile button */}
<button
  onClick={() => setCreateDrawerOpen(true)}
  className="hidden max-md:flex gap-2 items-center border rounded-md bg-secondary-600 hover:bg-secondary-700 px-4 py-2 text-sm transition-all"
>
  <Icons.createAccount size={16} />
  <span>Add [resource]</span>
</button>
```

These buttons stay in each page file. They are passed as the `actions` prop to `PageHeader`. The Sheet/Drawer components remain below PageHeader in the page's JSX (they are portals, so position does not matter).

---

## Phase 2: UserMenu Component

### Motivation

The user avatar and logout action currently live at the bottom of the Sidebar (desktop only). On mobile, there is a standalone logout button on the dashboard page only -- no other mobile page has logout access. This phase creates a single `UserMenu` component that provides consistent user account access across all viewports, placed in the `PageHeader`.

### Component API

**File:** `src/components/shared/UserMenu.tsx`

```typescript
// No external props -- UserMenu manages its own session data via useSession()
```

### Data Source

`useSession()` from `src/lib/auth-client.ts` returns:

```typescript
session.user.id: string
session.user.name: string
session.user.email: string
session.user.image: string | null  // Set only for Google OAuth users
session.user.emailVerified: boolean
```

### Desktop Rendering (md: and up)

The trigger is a clickable row:

```
[Avatar Circle] [Name + Email stacked vertically] [ChevronDown icon]
```

- **Avatar circle:** `w-8 h-8 rounded-full bg-primary` with the first character of `session.user.name` (fallback to email, fallback to "U"). If `session.user.image` is a non-null string, render an `<img>` instead of the initial letter.
- **Name:** `text-sm font-medium truncate max-w-[120px]` showing `session.user.name || session.user.email`.
- **Email:** `text-xs text-muted-foreground truncate max-w-[160px]` showing `session.user.email`. Only rendered if name is available (to avoid showing email twice).
- **Chevron:** `ChevronDown` from `lucide-react`, `size={16}`, `text-muted-foreground`.

### Mobile Rendering (below md:)

The trigger is only the avatar circle (no name, email, or chevron). Same avatar circle spec as desktop.

### Dropdown Content

Uses Shadcn `DropdownMenu` components:

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    {/* Trigger button with avatar */}
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-48">
    <DropdownMenuLabel>
      {session.user.name || session.user.email}
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild>
      <Link href="/settings">
        <Settings className="mr-2 h-4 w-4" />
        Settings
      </Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleLogout}>
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

Icons: `Settings` and `LogOut` from `lucide-react`.

### Logout Handler

Same pattern as current Sidebar:

```typescript
const handleLogout = () => {
  signOut({
    fetchOptions: {
      onSuccess: () => {
        router.push("/sign-in");
      }
    }
  });
};
```

### Integration with PageHeader

After `UserMenu` is created, update `PageHeader` to always render `UserMenu` on the right side:

```tsx
<div className="flex items-center justify-between flex-wrap gap-4">
  <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">
    {title}
  </h1>
  <div className="flex items-center gap-3">
    {actions}
    <UserMenu />
  </div>
</div>
```

This means `UserMenu` appears on every page that uses `PageHeader` -- providing consistent session access everywhere.

### Removals

1. **Sidebar user section (lines 222-270 of `src/components/shared/Sidebar.tsx`):** Remove the entire `{/* User section */}` block including both collapsed and expanded variants (avatar, name, logout button). Also remove `handleLogout`, `getUserInitial`, the `useSession` call, the `signOut` import, and the `useRouter` call IF they are no longer used elsewhere in the file. Remove the `Icons.logOut` reference.

2. **Dashboard logout button (lines 27-37 of `src/app/dashboard/page.tsx`):** Remove the wrapper `<div className='flex justify-between items-center'>` that contains both the `<h1>` and the mobile logout button. The `<h1>` is already handled by `PageHeader` from Phase 1. Also remove the `handleLogout` function, the `signOut` import, the `useRouter` import, and the `Icons` import if no longer used.

### Settings Placeholder Page

**File:** `src/app/settings/page.tsx`

A minimal page that renders:

```tsx
"use client"

import { PageHeader } from '@/components/shared/PageHeader'

export default function SettingsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 md:pb-6 flex flex-col">
      <PageHeader title="Settings" />
      <div className="mt-10 flex flex-col items-center justify-center text-center py-16">
        <p className="text-muted-foreground">Settings page coming soon.</p>
      </div>
    </div>
  )
}
```

This page is not added to the Sidebar or BottomBar navigation. It is only accessible via the UserMenu dropdown.

---

## Phase 3: MobileHeroSummary Component

### Motivation

On mobile, the dashboard renders NetWorthSection first (TotalNetWorthCard, then NetWorthHistoryChart, then AssetCategoriesChart, then MonthlySummaryChart). The key monthly metrics (income, expenses, savings) are buried below 3 scroll-lengths of charts. This phase promotes those metrics to the very top of the mobile dashboard.

### Component API

**File:** `src/components/dashboard/MobileHeroSummary.tsx`

```typescript
// No external props -- uses useMonthlySummary() hook internally
```

### Data Source

`useMonthlySummary()` from `src/hooks/useMonthlySummary.ts` returns:

```typescript
{
  summary: {
    currentMonth: { income: number; expenses: number; savings: number };
    lastMonth: { income: number; expenses: number; savings: number };
  } | null;
  isLoading: boolean;
  error: string | null;
}
```

### Visibility

The component renders only on mobile: wrap the entire output in `<div className="md:hidden">`.

### Layout

```
+----------------------------+
| [Income Card] [Expense Card] |  <- 2-column grid, gap-3
+----------------------------+
| [Net Savings - full width]  |  <- below the grid, gap-3
+----------------------------+
```

This mirrors the existing `MonthlySummaryChart` layout exactly (same 2-col grid for income/expense, same full-width savings bar), so the visual language is already familiar to users.

### Card Design

Each metric card follows the existing `MonthlySummaryChart` design tokens but adapted for a top-of-page hero context:

**Income Card:**
```
<div className="flex flex-col gap-1 p-3 rounded-lg bg-success-950/20 border border-success-900/30">
  <span className="text-muted-foreground text-xs">Income</span>
  <span className="text-foreground text-lg font-semibold">
    {formatCurrency(summary.currentMonth.income)}
  </span>
  <div className="flex items-center gap-1 text-xs {changeColor}">
    <ChangeIcon className="w-3 h-3" />
    <span>{percentage}% vs last month</span>
  </div>
</div>
```

**Expense Card:** Same structure, `bg-error-950/20 border border-error-900/30`.

**Net Savings Bar:**
```
<div className="flex items-center justify-between p-3 rounded-lg bg-secondary-950/50 border border-border">
  <span className="text-muted-foreground text-sm">Net savings</span>
  <span className="text-xl font-bold {savingsColor}">
    {formatCurrency(summary.currentMonth.savings)}
  </span>
</div>
```

### Percentage Change Logic

Reuse the same calculation as `MonthlySummaryChart`:

```typescript
const incomeChange = summary.lastMonth.income > 0
  ? ((summary.currentMonth.income - summary.lastMonth.income) / summary.lastMonth.income) * 100
  : 0;

const expenseChange = summary.lastMonth.expenses > 0
  ? ((summary.currentMonth.expenses - summary.lastMonth.expenses) / summary.lastMonth.expenses) * 100
  : 0;
```

Color logic:
- Income: positive change = `text-text-success`, negative = `text-text-error`
- Expenses: negative change (less spending) = `text-text-success`, positive = `text-text-error`
- Savings: `>= 0` = `text-text-success`, `< 0` = `text-text-error`

Icons: `TrendingUp`, `TrendingDown`, `Minus` from `lucide-react`.

### Loading State

Show 3 skeleton cards matching the layout:

```
<div className="md:hidden flex flex-col gap-3">
  <div className="grid grid-cols-2 gap-3">
    <Skeleton className="h-20 rounded-lg" />
    <Skeleton className="h-20 rounded-lg" />
  </div>
  <Skeleton className="h-12 rounded-lg" />
</div>
```

### Error / No Data State

If `error` is truthy or `summary` is null, render nothing (return `null`). The hero is a convenience enhancement -- it should not display error states that block the rest of the dashboard. The existing `MonthlySummaryChart` below handles its own error/empty states.

### Integration with Dashboard Page

In `src/app/dashboard/page.tsx`, add `<MobileHeroSummary />` directly after `<PageHeader>` and before `<NetWorthSection />`:

```tsx
<PageHeader title="Dashboard" />
<MobileHeroSummary />
<NetWorthSection />
```

### Hide MonthlySummaryChart on Mobile

In `src/components/dashboard/NetWorthInsights.tsx`, wrap the `MonthlySummaryChart` and its separator in a container that hides on mobile:

**Current:**
```tsx
<div className='border-t border-border' />
<MonthlySummaryChart />
```

**After:**
```tsx
<div className="hidden lg:block">
  <div className='border-t border-border' />
  <MonthlySummaryChart />
</div>
```

This hides `MonthlySummaryChart` (and its separator) below `lg` breakpoint, preventing duplicate data display. On desktop (`lg:` and up), nothing changes -- `MonthlySummaryChart` remains visible in the `NetWorthInsights` panel.

Why `lg:` instead of `md:`? The `NetWorthSection` grid uses `lg:grid-cols-5` -- the two-column layout (where `NetWorthInsights` sits beside `NetWorthDisplay`) only activates at `lg:`. Below `lg:`, everything stacks vertically and `MonthlySummaryChart` would appear far down the page after multiple charts. Hiding it at this same breakpoint ensures the mobile hero is the only place these metrics appear when the layout is stacked.

---

## Phase 4: Mobile Back Button on Detail Pages

### Motivation

Three detail sub-pages (`/accounts/[id]`, `/cards/[id]`, `/cards/groups/[groupName]`) have no back navigation on mobile. The Sidebar provides context on desktop, but on mobile users must use the browser back button or the BottomBar to navigate away.

### Design Decision: Explicit href, Not router.back()

Uses `<Link href="/accounts">` (or `/cards`) instead of `router.back()` because:
- Deeplinks, bookmarks, and shared URLs have no history stack -- `router.back()` would navigate to an unexpected location.
- PWA users have no browser chrome to recover from bad back navigation.
- The back link is "up" navigation (to the parent list), not "back" navigation (to the previous history entry).

### Placement

The back link goes **inside** the existing gradient card, as the first element within the mobile layout (`<div className="flex md:hidden flex-col gap-3">`), above the existing icon + name row.

### Rendering

```tsx
<Link
  href="/accounts"  {/* or "/cards" for card detail pages */}
  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
>
  <IconArrowLeft size={16} />
  <span>Accounts</span>  {/* or "Cards" */}
</Link>
```

Uses `IconArrowLeft` from `@tabler/icons-react` (consistent with other Tabler icons used in the codebase for navigation elements) or `ArrowLeft` from `lucide-react`. The Builder should use whichever icon library is already imported in the target file. If neither is imported, prefer `lucide-react` (`ArrowLeft`).

### Pages to Update

| # | Page | File | Back Link Text | href |
|---|------|------|----------------|------|
| 1 | Account Detail | `src/app/accounts/[id]/page.tsx` | Accounts | `/accounts` |
| 2 | Card Detail | `src/app/cards/[id]/page.tsx` | Cards | `/cards` |
| 3 | Card Group Detail | `src/app/cards/groups/[groupName]/page.tsx` | Cards | `/cards` |

### Exact Insertion Point

For each file, find the mobile layout block:

```tsx
<div className="flex md:hidden flex-col gap-3">
  {/* INSERT BACK LINK HERE as first child */}
  <div className="flex items-center gap-2">  {/* existing icon + name row */}
```

The back link is a direct child of the `md:hidden` flex-col container, appearing before the icon + name row.

### Desktop

No back link on desktop. The Sidebar provides navigation context, and the pages already have breadcrumb-like context from the URL. The back link div is naturally hidden because its parent is `md:hidden`.

---

## Accessibility

1. `PageHeader` renders a semantic `<h1>` -- no changes to heading hierarchy.
2. `UserMenu` dropdown trigger should have `aria-label="User menu"` on the trigger button.
3. `DropdownMenu` from Shadcn already handles `aria-expanded`, `role="menu"`, and keyboard navigation.
4. Back links are standard `<Link>` (anchor) elements -- focusable and screen-reader accessible by default.
5. `MobileHeroSummary` metric cards are informational only (no interactive elements) -- no ARIA needed beyond semantic HTML.

---

## Test Impact

### New Tests Expected

The QA pipeline will generate tests for:
- `PageHeader` -- renders title, renders actions, renders without actions
- `UserMenu` -- renders avatar, opens dropdown, settings link, logout action
- `MobileHeroSummary` -- renders metrics, handles loading, handles null data

### Existing Tests That May Need Updates

| Test File | Potential Change |
|-----------|-----------------|
| `src/components/dashboard/TotalNetWorthCard.test.tsx` | May reference dashboard page structure |
| `src/components/dashboard/TotalNetWorthCard.debug.test.tsx` | Same |
| Any test asserting on `<h1>` text in page-level components | If the test renders the full page, the h1 is now inside PageHeader |

The Builder should run `npx vitest run` after each phase to catch any broken assertions.

---

## Verification Plan

For each phase:

1. **Lint passes:** `npm run lint` returns zero errors.
2. **Build passes:** `npm run build` returns zero errors.
3. **Tests pass:** `npx vitest run` -- all existing tests pass (with any updated assertions).
4. **Visual verification:** The Builder should describe the rendered output in the verification doc to confirm correctness.

---

## Handoff Note for Builder

**Read this entire spec before writing any code.**

1. **Phase execution order matters.** Phase 1 (PageHeader) must be completed first because Phase 2 (UserMenu) modifies PageHeader to include it. Phase 3 (MobileHeroSummary) depends on the dashboard page already using PageHeader. Phase 4 (back buttons) is independent but should come last.

2. **PageHeader is intentionally minimal.** Do not add subtitle, breadcrumbs, or any other features. The `title` and `actions` props cover all current use cases. Future features can extend it.

3. **Action buttons stay in page files.** When refactoring a page to use `PageHeader`, move the existing desktop/mobile button elements into the `actions` prop. Do NOT move them into the PageHeader component itself. Each page owns its own create Sheet/Drawer state and triggers.

4. **UserMenu calls useSession() itself.** It is a self-contained component. The parent (PageHeader) does not pass session data down.

5. **When removing the Sidebar user section**, be careful not to remove imports that are still used elsewhere in the file (e.g., `usePathname`, `Link`). Only remove imports that become unused after the user section is deleted. The `useSession` and `signOut` imports should become unused; the `useRouter` import should become unused (it was only used for `handleLogout`). Verify by checking for other references in the file.

6. **MobileHeroSummary reuses MonthlySummaryChart's logic.** The percentage change calculations, color functions, and icon selection are identical. Consider extracting shared utilities if the duplication feels excessive, but this is optional -- the Builder can inline the logic and note in the verification doc that extraction is a future refactor opportunity.

7. **The `hidden lg:block` on MonthlySummaryChart** must wrap both the separator `<div>` and the `<MonthlySummaryChart />` component in `NetWorthInsights.tsx`. Do not hide them separately or the separator will show without the chart on tablet viewports.

8. **Back links use explicit hrefs, not router.back().** This is a deliberate design decision documented in the spec.

9. **Settings page is a placeholder.** It should use `PageHeader` with `title="Settings"` and render a centered "Settings page coming soon." message. No settings functionality is expected.

10. **For the More page**, the current h1 uses `text-2xl font-semibold` without responsive sizes. When refactoring to PageHeader, the h1 will get the standard responsive classes (`md:text-3xl lg:text-4xl md:font-bold`). This is an intentional normalization. The subtitle `<p>` tag below the h1 should remain as a separate element after PageHeader, not inside it.

11. **Follow one-commit-per-task convention** from the plan. Each task in the XML plan gets its own atomic commit.
