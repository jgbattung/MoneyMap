# Accounts Summary Polish — Spec

> Aligns the `AccountsSummary` section (TopAccounts + TopCreditCards) with the established dashboard polish patterns from TotalNetWorthCard and BudgetStatus.

## Goal

Bring the two account/card list widgets up to the same visual and interaction quality as the already-polished dashboard components. No new features — only UX, consistency, and code quality improvements.

## Current State

The `AccountsSummary` component at `src/components/dashboard/AccountsSummary.tsx` renders two `money-map-card` containers:

1. **TopAccounts** — shows top 5 accounts sorted by balance
2. **TopCreditCards** — shows top 5 credit cards sorted by absolute balance

### Issues

| # | Issue | Severity |
|---|-------|----------|
| 1 | No hover states on list items — visually static | Medium |
| 2 | No account type icons — text-only labels | Medium |
| 3 | Duplicate `formatCurrency()` — should use shared `src/lib/format.ts` | Low |
| 4 | Inconsistent error state — missing AlertCircle icon and retry button | Medium |
| 5 | No entrance animations — all other polished components have them | Medium |
| 6 | `text-white` hardcoded on CreditCardItem balance — should use token | Low |
| 7 | Uses `export default` — should be named export | Low |
| 8 | No `prefers-reduced-motion` support | High |
| 9 | Duplicate skeleton components (AccountList and CardList are identical) | Low |
| 10 | Empty state lacks visual weight — no icon | Low |
| 11 | List items not clickable — detail pages exist at `/accounts/[id]` and `/cards/[id]` | Medium |

## Design Decisions

### Account Type Icons (lucide-react)

| Account Type | Icon | Rationale |
|-------------|------|-----------|
| CHECKING | `Landmark` | Bank/institution |
| SAVINGS | `PiggyBank` | Traditional savings symbol |
| INVESTMENT | `TrendingUp` | Growth/markets |
| CASH | `Banknote` | Physical currency |
| CRYPTO | `Bitcoin` | Crypto currency |
| RETIREMENT | `Clock` | Long-term/time-based |
| REAL_ESTATE | `Home` | Property |
| PAYROLL | `Briefcase` | Work/employment |
| E_WALLET | `Smartphone` | Digital wallet |
| OTHER | `Wallet` | Generic financial |
| Credit Card | `CreditCard` | All credit card items |

### Hover States

List items get interactive hover treatment:
- `hover:bg-secondary-500/10 rounded-lg px-2 -mx-2 transition-colors duration-200 cursor-pointer`
- The negative margin trick keeps text alignment while expanding the hover target area
- Entire row is wrapped in a `Link` component

### Clickable Items

- Account items link to `/accounts/{id}`
- Credit card items link to `/cards/{id}`
- The "See All" buttons remain unchanged

### Entrance Animations

Following the established pattern (BudgetStatus progress bars):
- List items stagger in with `initial={{ opacity: 0, y: 8 }}` → `animate={{ opacity: 1, y: 0 }}`
- 50ms stagger delay between items
- 300ms duration with `easeOut` easing
- `useReducedMotion()` check — render instantly when user prefers reduced motion

### Error State Pattern

Match TotalNetWorthCard exactly:
```
<AlertCircle className="h-8 w-8 text-error-600" />
<p className="text-error-600 font-semibold">Failed to load {type}</p>
<p className="text-muted-foreground text-sm">{error}</p>
<button onClick={refetch} className="cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1">
  Try again
</button>
```

### Empty State Enhancement

Add a contextual icon above the message:
- Accounts: `Wallet` icon (h-8 w-8, text-muted-foreground/50)
- Cards: `CreditCard` icon (h-8 w-8, text-muted-foreground/50)

## What NOT to Do

- Don't add `scale` transforms on hover — causes layout shift (ui-ux-pro-max anti-pattern)
- Don't animate more than the list entrance — excessive motion is High severity
- Don't use `linear` easing — feels robotic, use `easeOut`
- Don't install new dependencies — `framer-motion` and `lucide-react` are already available
- Don't add balance privacy toggle here — that's a TotalNetWorthCard concern only
- Don't change the grid layout or card structure — only polish internals

## Files Affected

- `src/components/dashboard/AccountsSummary.tsx` — primary target (all changes here)
- No other files need modification

## Verification

- All account types render with correct icons
- Hover states visible on every list item
- Clicking an account navigates to `/accounts/{id}`
- Clicking a credit card navigates to `/cards/{id}`
- Error state shows AlertCircle + retry button, retry triggers refetch
- Empty state shows contextual icon
- Entrance animation plays on mount (staggered fade-in)
- Animation skipped when `prefers-reduced-motion` is enabled
- `npm run lint` passes
- `npm run build` passes
- No visual regressions in other dashboard sections

---

## Handoff Note for Builder

**Feature:** Accounts Summary Polish
**Branch name suggestion:** `feature/accounts-summary-polish`
**Files most likely to be affected:**
- `src/components/dashboard/AccountsSummary.tsx`

**Watch out for:**
- The `useAccountsQuery` and `useCardsQuery` hooks already expose `refetch` — just destructure it
- Credit card balances are stored as negative in DB and inverted for display — don't break this logic
- The `formatCurrency` import from `src/lib/format.ts` uses the same signature as the local one — drop-in replacement
- Account/card objects have an `id` field available from the API response — use it for Link hrefs
- `framer-motion`'s `useReducedMotion()` returns `boolean | null` — treat `null` as false

**Verification focus:**
- Hover states should not cause layout shift (no padding/size changes on hover)
- Animation stagger should feel natural, not jarring
- Error retry button must actually trigger data refetch
- Credit card balance display must remain positive (negated from DB value)
