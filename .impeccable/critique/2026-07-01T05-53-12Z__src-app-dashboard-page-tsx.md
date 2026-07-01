---
target: dashboard
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-07-01T05-53-12Z
slug: src-app-dashboard-page-tsx
---
# Critique: Dashboard (`src/app/dashboard/page.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Skeletons, error+retry, hide-balance feedback everywhere. Excellent. |
| 2 | Match System / Real World | 3 | Natural finance language; `PHP` vs `₱` symbol conventions clash. |
| 3 | User Control and Freedom | 3 | Balance hide toggle, retry, nav. Read-only surface; adequate. |
| 4 | Consistency and Standards | 2 | 4+ surface treatments for peer cards; two currency conventions; off-token amber; duplicate formatCurrency. |
| 5 | Error Prevention | n/a | Read-only dashboard; little to prevent. |
| 6 | Recognition Rather Than Recall | 4 | Everything visible, icons labeled, no memorization. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no chart range control, fixed top-5, no widget customization. |
| 8 | Aesthetic and Minimalist Design | 3 | Mostly restrained; multi-surface color competition adds mild noise. |
| 9 | Error Recovery | 3 | Plain "Failed to load X" + Try again; raw `{error}` string can leak technical text. |
| 10 | Help and Documentation | 2 | No metric explanations (what's in "net worth"? which period?); one nice chart tooltip. |
| **Total** | | **29/40** | **Good — solid foundation, address the weak areas** |

## Anti-Patterns Verdict

**Does this look AI-generated? No.** Deterministic detector (`detect.mjs`) scanned the page + all dashboard components and returned **zero findings**. No gradient text, no side-stripe borders, no glassmorphism, no eyebrow kickers, no hero-metric cliche. Layout, empty/error/loading states, and semantic gain/loss coloring paired with directional icons all read as a real, competently-built product dashboard.

The failure mode here is NOT slop — it's **inconsistency without purpose**, the product-register tell: peer-level cards rendered in four different surface systems, currency shown two different ways, and two of the project's own `DESIGN.md` rules unfollowed. Individually minor; together they quietly erode the "precise, trustworthy" intent.

(Browser visualization not run — no browser automation available this session. Assessment B is the deterministic scan only.)

## Overall Impression

Structurally strong and genuinely calm in places, with best-in-class loading/empty/error handling. The single biggest opportunity: **unify the surface + number treatment so the dashboard *looks* as precise as it behaves.** Right now the craft is undercut by small inconsistencies that a finance tool, of all things, can't afford.

## What's Working

1. **State handling is excellent.** Every widget has skeleton, empty (with a teaching CTA), and error+retry states. This is the product register done right and the dashboard's strongest asset.
2. **Gain/loss is colorblind-safe already.** `text-success`/`text-error` are always paired with Arrow/Trending icons and +/− signs — hue is never the sole signal. Keep this through the reskin.
3. **The net-worth hero is right.** Big value, hide-balance toggle, monthly-change pill with directional icon — it answers "where do I stand, which way am I trending" at a glance.

## Priority Issues

- **[P1] Four surface systems for peer-level cards.** `NetWorthDisplay` uses `bg-secondary-800`, `NetWorthInsights` uses `bg-secondary-700`, the main widgets use `.money-map-card` (`bg-card`), and `MobileHeroSummary` uses tinted `bg-success-950/20` / `bg-error-950/20` / `bg-secondary-950/50`. Your own DESIGN.md **Tonal-Step Rule** says elevation is *one* lightness step. Four competing surfaces read as "glued-together panels," the exact drift toward enterprise-blandness the brief rejects.
  - **Fix:** Collapse to the single card surface + hairline border. Reserve the joined two-tone panel only if it's a deliberate signature, not an accident.
  - **Command:** `/impeccable layout` (then `/impeccable colorize` for token unification)

- **[P1] Numbers aren't monospaced — the Monospace Money Rule is unfollowed.** Every figure (net worth, balances, deltas, budget amounts) uses Geist Sans with `font-bold`/`font-semibold`, no `tabular-nums`. Columns of pesos don't align on the decimal. For a tool whose principle is literally "precision you can trust," this is the highest-leverage brand fix.
  - **Fix:** Route all currency through a mono, tabular-figure treatment (Geist Mono + `font-variant-numeric: tabular-nums`).
  - **Command:** `/impeccable typeset`

- **[P2] Currency is shown two ways, formatted by two functions.** `TotalNetWorthCard` shows `PHP` as a separate label; everywhere else hardcodes a `₱` prefix. `RecentTransactions` and `NetWorthHistoryChart` define their own local `formatCurrency` instead of `@/lib/format`. Same data, different presentation = eroded trust.
  - **Fix:** One currency-display convention, one formatter.
  - **Command:** `/impeccable clarify` (consistency pass)

- **[P2] Off-token colors leak in.** `BudgetStatus` uses raw `bg-amber-400`/`text-amber-400` (a Tailwind default, not a design token); the mobile hero's tinted success/error cards add saturated competition on the smallest screen. This is where the palette starts drifting from the rationed, tokenized system.
  - **Fix:** Map warning to the gold/accent token; quiet the mobile tinted cards toward the tonal-step system.
  - **Command:** `/impeccable colorize`

- **[P2] Thin for a power user's daily tool.** No keyboard affordances, the history chart is locked to "Last 12 Months" with no range toggle, lists are fixed at top-5 with no density control, widgets can't be reordered/hidden. The Alex persona (which is *you*) hits a ceiling fast.
  - **Fix:** Consider a chart range control and light keyboard/efficiency affordances as a scoped feature.
  - **Command:** `/impeccable shape` (feature-level, later)

## Persona Red Flags

**Alex (Power User) — this persona is literally the sole user:**
- History chart hard-locked to 12 months; no way to see 3M / 6M / YTD / all.
- No keyboard shortcuts for anything; no way to jump to a widget.
- Fixed top-5 accounts/cards/budgets with no "expand inline" — must navigate away.
- No customization: can't reorder, hide, or resize widgets on a tool you open daily.

**Sam (Accessibility):**
- Good: gain/loss never relies on hue alone; focus-visible rings exist on primitives; reduced-motion is honored throughout.
- Watch: the AssetCategories segmented bar conveys distribution by `backgroundColor` only on the bar itself (labels below carry names, so acceptable); confirm the tooltip is keyboard-reachable, not hover-only.
- Six `<h2>`s under one `<h1>` ("Dashboard") is a flat but valid heading tree; fine.

**The Owner (project persona — calm, precise, returns daily):**
- The four-surface inconsistency and dual currency convention are exactly what a precision-minded owner notices and is nagged by over hundreds of visits.

## Minor Observations

- Raw `{error}` strings render directly to the user — can expose technical/DB text (Riley red flag). Consider a friendly fallback message.
- `PageHeader` title "Dashboard" + UserMenu is low-value real estate; a date / "as of" context or a subtle greeting could earn that row.
- The joined `rounded-l` / `rounded-r` two-tone net-worth panel is a clever idea executed with two near-identical grays — commit to it as a signature or drop it.

## Questions to Consider

- What would the dashboard look like if *every peso on screen* were set in the same aligned, monospaced figure?
- Is the two-tone net-worth panel a deliberate signature, or an accident of two secondary grays? Decide, then make it obvious.
- On a tool you open daily and only you use, what three efficiency affordances would you actually reach for?
