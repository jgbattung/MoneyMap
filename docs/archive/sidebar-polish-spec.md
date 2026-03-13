# Sidebar Polish — Collapsible Groups, Icon Rail, Icon Consistency & Scroll Fixes

## Executive Summary

The sidebar has usability issues on shorter screens (visible scrollbar, clipped content) and doesn't scale well with 9 nav items + 3 quick actions. Icons are an inconsistent mix of filled and outline styles. This spec introduces collapsible nav groups, an icon-rail toggle, consistent outline-default/filled-active icons, animated transitions, and scroll/spacing/a11y fixes.

## Current State

- **File:** `src/components/shared/Sidebar.tsx`
- **Layout:** `src/components/layouts/ConditionalLayout.tsx`
- **Navigation config:** `src/app/constants/navigation.ts`
- **Mobile nav:** `src/components/shared/BottomBar.tsx`

### Issues Identified

1. **Visible scrollbar** on shorter screens — `overflow-y-auto` shows a native scrollbar
2. **Content clipping** — `justify-center` pushes top items off-screen when vertical space is tight
3. **Spacing too generous** — `mb-6`, `gap-3` don't scale on shorter viewports
4. **Fixed-width buttons** — `w-36` on quick action buttons clips text
5. **CSS typo** — `Sidebar.tsx:163` has `className='hidden: md:block'` (colon breaks the class)
6. **No semantic HTML** — no `<nav>` element, no `aria-label` on logout button
7. **No `cursor-pointer`** on quick action buttons
8. **Thick border** — `border-r-2` looks heavy
9. **Inconsistent icons** — 5 filled, 4 outline, no logic to the mix
10. **No collapsible groups** — 9 flat nav items cause scrolling on shorter screens
11. **No collapsible sidebar** — no way to reclaim screen space

### Design Research (ui-ux-pro-max + Web Search Findings)

| Finding | Source | Impact |
|---------|--------|--------|
| Group items into collapsible sections when 7+ nav items | NN/Group — Vertical Nav | Directly solves the scroll problem |
| Collapsed icon rail: 48-64px, expanded: 240-300px | UX Planet — Sidebar Design | `w-16` (64px) collapsed, `w-56` (224px) expanded |
| Outline default, filled on active state is industry standard | UX Movement — Solid vs Outline Icons | Two visual cues: icon weight + bg highlight |
| `aria-label` for icon-only buttons (severity: High) | UX domain — ARIA Labels | Logout button + collapsed mode icons |
| Tooltips essential in collapsed icon rail | NN/Group — Menu Checklist | Users can't rely on labels alone |
| Use 150-300ms for micro-interactions, >500ms feels sluggish | UX domain — Duration Timing | Sidebar + group transitions: 200ms |
| Use `ease-out` for entering, `ease-in` for exiting | UX domain — Easing Functions | Consistent with project animation conventions |
| `prefers-reduced-motion` is High severity | UX domain — Reduced Motion | All animations must respect this |
| Hidden overflow can clip important content | UX domain — Overflow Hidden | Validates fixing `justify-center` clipping |
| `cursor-pointer` on all clickable elements | Pre-delivery checklist | Quick action buttons missing this |

### What NOT To Do

- **Do NOT migrate to shadcn's Sidebar component** — too large a rewrite for a polish pass
- **Do NOT change navigation routes, paths, or add/remove pages**
- **Do NOT touch BottomBar layout** — only update its icon references for consistency
- **Do NOT use framer-motion for sidebar/group animations** — these are simple CSS transitions; keep bundle lean
- **Do NOT install new packages** — Radix Tooltip (shadcn) and Tabler Icons are already available
- **Do NOT use `linear` easing** — feels robotic; use `ease-out`/`ease-in`
- **Do NOT animate `height` directly** — triggers layout recalc every frame; use `grid-template-rows` trick

## Scope

### In Scope

**1. Collapsible Nav Groups**
- A. Group nav items into logical sections with collapsible headers
- B. Active route's group auto-expands on mount
- C. Group collapsed/expanded state persisted in `localStorage`
- D. Animated expand/collapse with `grid-template-rows` transition

**2. Icon Rail Toggle (Collapsed Sidebar)**
- E. Toggle button to collapse sidebar from `w-56` to `w-16`
- F. Collapsed mode: icon-only nav items with Radix tooltips
- G. Collapsed mode: icon-only quick action buttons with tooltips
- H. Collapsed mode: avatar-only user section, logout icon visible
- I. Collapsed state persisted in `localStorage`
- J. Animated width + opacity transition

**3. Icon Consistency**
- K. Update `navRoutes` to carry `icon` (outline) and `activeIcon` (filled) per route
- L. Sidebar renders outline icons by default, filled when active
- M. Update `mobileNavRoutes` in BottomBar to match the same pattern

**4. Scroll & Spacing Fixes**
- N. Replace `justify-center` with `justify-start`
- O. Hide scrollbar with CSS (`scrollbar-width: none` / `::-webkit-scrollbar`)
- P. Tighten spacing: `mb-6` → `mb-4`, `gap-3` → `gap-2`
- Q. Remove fixed `w-36` on quick action buttons — use `w-fit` so buttons hug their content

**5. Bug Fixes & Accessibility**
- R. Fix CSS typo: `hidden: md:block` → `hidden md:block`
- S. Wrap nav links in `<nav>` element
- T. Add `aria-label="Log out"` on logout button
- U. Add `cursor-pointer` on quick action buttons
- V. Slim border: `border-r-2` → `border-r`

### Out of Scope

- Migrating to shadcn's Sidebar component
- Changes to navigation routes or pages
- BottomBar layout changes (only icon updates)
- Adding new pages or features
- Database or API changes

## Detailed Requirements

### A. Nav Group Structure

Group the 9 nav items into collapsible sections in `navigation.ts`:

| Group | Key | Items |
|-------|-----|-------|
| *(ungrouped)* | — | Dashboard |
| **Accounts** | `accounts` | Accounts, Cards |
| **Activity** | `activity` | Transactions, Expenses, Income, Transfers |
| **Planning** | `planning` | Budgets, Reports |

Update `navigation.ts` to export a `navGroups` structure:

```ts
export interface NavRoute {
  name: string;
  path: string;
  icon: Icon;
  activeIcon: Icon;
}

export interface NavGroup {
  label: string;
  key: string;
  routes: NavRoute[];
}

export const dashboardRoute: NavRoute = { ... };
export const navGroups: NavGroup[] = [ ... ];
```

Dashboard stays ungrouped (always visible, top-level entry point).

### B. Group Auto-Expand on Active Route

On mount, check `pathname` against all group routes. If the active route belongs to a group, that group should start expanded — regardless of `localStorage` state.

### C. Group State Persistence

Store group collapsed/expanded state in `localStorage` under key `money-map-sidebar-groups`:

```ts
// Example: { accounts: true, activity: true, planning: false }
// true = expanded, false = collapsed
```

Default all groups to expanded on first visit.

### D. Group Expand/Collapse Animation

Use the CSS `grid-template-rows: 0fr → 1fr` technique:

```css
/* Container */
.group-content {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 200ms ease-out;
}
.group-content.expanded {
  grid-template-rows: 1fr;
}
/* Inner wrapper */
.group-content > div {
  overflow: hidden;
}
```

- Duration: **200ms**
- Easing: **ease-out** for expanding, **ease-in** for collapsing
- `prefers-reduced-motion`: instant show/hide, no transition

Group headers show a chevron icon (`IconChevronDown`) that rotates 180deg when expanded → collapsed, also animated at 200ms.

### E. Sidebar Rail Toggle

Place the toggle button in the **logo/header row** (top of sidebar), following the Linear/Notion/shadcn pattern:

- **Expanded mode:** `IconChevronLeft` button right-aligned in the logo row, inline with "MoneyMap"
- **Collapsed mode:** `IconChevronRight` button centered below the "M" logomark
- Style: `p-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer`
- `aria-label="Collapse sidebar"` / `"Expand sidebar"`
- Rationale: Top placement follows Fitts's Law (proximity to the element it controls), users scan top-to-bottom so discover it first, and avoids crowding the bottom user profile area

### F. Collapsed Mode: Nav Items

In collapsed (`w-16`) mode:

- Group headers are hidden
- All nav items render as icon-only buttons centered in the rail
- Each icon wrapped in Radix `Tooltip` showing the route name
- Active state: filled icon + `bg-white/15` background circle/rounded container
- Inactive state: outline icon, no background

### G. Collapsed Mode: Quick Actions

- Quick action buttons render as icon-only circular buttons
- Each wrapped in Radix `Tooltip` showing the action name ("Add expense", etc.)
- The "Quick actions" heading is hidden
- Style: `w-10 h-10 rounded-full border border-white/40 flex items-center justify-center hover:bg-white/10 cursor-pointer`

### H. Collapsed Mode: User Section

- Show only the avatar circle (initial letter)
- Username text hidden
- Logout button remains visible as icon
- Both wrapped in tooltips

### I. Sidebar Collapsed State Persistence

Store in `localStorage` under key `money-map-sidebar-collapsed`:
- `"true"` = collapsed (icon rail)
- `"false"` or absent = expanded (default)

### J. Sidebar Collapse/Expand Animation

Animate the sidebar width transition:

- **Width:** `w-56` (224px) ↔ `w-16` (64px) via CSS `transition: width 200ms ease-out`
- **Text/labels:** Fade out with `opacity` transition (150ms) *before* width shrinks on collapse; fade in *after* width expands
- **`prefers-reduced-motion`:** Instant snap, no transition
- The main content area (`flex-1 overflow-auto` in ConditionalLayout) should naturally flex to fill the remaining space

### K. Icon Mapping (navRoutes)

Update `navigation.ts` with outline default + filled active:

| Route | `icon` (outline) | `activeIcon` (filled) |
|-------|-------------------|-----------------------|
| Dashboard | `IconHome` | `IconHomeFilled` |
| Accounts | `IconCashBanknote` | `IconCashBanknoteFilled` |
| Cards | `IconCreditCard` | `IconCreditCardFilled` |
| Transactions | `IconSwitchHorizontal` | `IconReceiptFilled` * |
| Budgets | `IconPig` | `IconPigFilled` |
| Expenses | `IconWallet` | `IconCoinFilled` * |
| Income | `IconTrendingUp` | `IconGraphFilled` * |
| Transfers | `IconArrowsExchange` | `IconExchangeFilled` * |
| Reports | `IconChartBar` | `IconReportAnalyticsFilled` * |

\* These routes don't have a direct `Filled` variant in Tabler. The alternatives are chosen for visual similarity and semantic meaning. The Builder should visually verify these look cohesive and swap if needed.

**Alternative approach if the mixed filled icons look inconsistent:** Use a wrapper that adds a subtle filled-background effect (e.g., a small rounded `bg-white/15` circle behind the outline icon) instead of switching icon variants. This keeps all icons visually uniform.

### L. Sidebar Icon Rendering

In `Sidebar.tsx`, render based on route match:

```tsx
{pathname.startsWith(route.path) ? (
  <route.activeIcon size={20} />
) : (
  <route.icon size={20} />
)}
```

### M. BottomBar Icon Update

Update `mobileNavRoutes` to also carry `icon` and `activeIcon` fields. Update BottomBar rendering to match the outline/filled pattern.

### N–V. Scroll, Spacing, Bug Fixes & A11y

See items listed in Scope section. All are straightforward class changes:

- **N.** `justify-center` → `justify-start` on flex-1 container
- **O.** Add to the scrollable container: `className="scrollbar-hide"` + global CSS:
  ```css
  .scrollbar-hide { scrollbar-width: none; }
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  ```
- **P.** `mb-6` → `mb-4`, `gap-3` → `gap-2`
- **Q.** Remove `w-36` from quick action buttons
- **R.** `'hidden: md:block'` → `'hidden md:block'`
- **S.** Wrap the main menu links in `<nav aria-label="Main navigation">`
- **T.** Add `aria-label="Log out"` to logout button
- **U.** Add `cursor-pointer` to quick action buttons
- **V.** `border-r-2` → `border-r`

## Custom Hook: `useSidebarState`

Create `src/hooks/useSidebarState.ts` to manage both sidebar collapsed state and group expanded states:

```ts
export function useSidebarState() {
  // Returns:
  // - isCollapsed: boolean
  // - toggleCollapsed: () => void
  // - groupStates: Record<string, boolean>
  // - toggleGroup: (key: string) => void
  // - isGroupExpanded: (key: string) => boolean
  //
  // Reads/writes localStorage for persistence
  // Auto-expands group containing the active route on mount
}
```

This hook is used by `Sidebar.tsx` only.

---

## Handoff Note for Builder

**Feature:** Sidebar Polish — Collapsible Groups, Icon Rail, Icon Consistency & Scroll Fixes
**Branch name suggestion:** `feature/sidebar-polish`
**Files most likely to be affected:**
- `src/app/constants/navigation.ts` — new types, `navGroups` structure, icon updates
- `src/components/shared/Sidebar.tsx` — major rewrite
- `src/components/shared/BottomBar.tsx` — icon update only
- `src/components/layouts/ConditionalLayout.tsx` — minor (layout flex)
- `src/hooks/useSidebarState.ts` — new file
- `src/app/globals.css` — scrollbar-hide utility + grid transition styles

**Watch out for:**
- Some Tabler icons don't have `Filled` variants (`IconSwitchHorizontalFilled`, `IconWalletFilled`, etc.). The spec provides alternatives — visually verify they look cohesive. If they clash, fall back to the "bg circle behind outline icon" approach for active state
- Radix Tooltip (shadcn) is already installed at `src/components/ui/tooltip.tsx` — use it directly
- `localStorage` is not available during SSR. Guard all reads with `typeof window !== 'undefined'` or use `useEffect` for initial state
- The sidebar animation uses CSS `transition` on `width` — this triggers layout recalc but is acceptable for a 200ms duration that fires only on user click (not scroll/resize)
- `ConditionalLayout.tsx` uses `flex-1` on the content area — this should naturally adapt to sidebar width changes without modification, but verify
- The `grid-template-rows` animation technique requires a wrapper div with `overflow: hidden` on the inner content — don't skip this
- `prefers-reduced-motion` must be respected for ALL animations: sidebar width, group expand/collapse, chevron rotation. Use a CSS media query approach rather than a JS hook since these are all CSS transitions
- Do NOT change any imports or files related to dashboard components — this spec is sidebar-only

**Verification focus:**
- `npm run build` passes with zero errors
- `npm run lint` passes with zero errors
- Sidebar collapses to icon rail and expands back with smooth animation
- Nav groups collapse/expand with smooth animation
- Active route's group auto-expands on page load
- Tooltips appear on all icons in collapsed mode
- Icons are outline by default, filled when active — in both expanded and collapsed modes
- BottomBar icons match the outline/filled pattern
- No visible scrollbar on shorter screens
- Content no longer clips at the top on shorter screens
- `prefers-reduced-motion` disables all animations
- Sidebar and group states persist across page reloads (localStorage)
- CSS typo on CreateExpenseTransactionSheet is fixed
- Logout button has `aria-label`
- Quick action buttons have `cursor-pointer`