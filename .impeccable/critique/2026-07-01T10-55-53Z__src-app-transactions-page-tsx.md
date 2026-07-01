---
target: transactions
total_score: 32
p0_count: 0
p1_count: 2
timestamp: 2026-07-01T10-55-53Z
slug: src-app-transactions-page-tsx
---
# Critique: Transactions (`src/app/transactions/page.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Skeletons, filtered counts, loading-disables filters. Excellent. |
| 2 | Match System / Real World | 3 | Natural, but bare numbers with no ₱ in the desktop tables read ambiguously. |
| 3 | User Control and Freedom | 4 | Inline row editing (edit/cancel), edit drawers on mobile, clear filters. |
| 4 | Consistency and Standards | 2 | Mobile shows ₱ + monospace; desktop tables show bare left-aligned sans numbers. Same data, two presentations. |
| 5 | Error Prevention | 3 | Typed editable cells, date pickers, filters disabled while loading. |
| 6 | Recognition Rather Than Recall | 4 | Filters labeled, active tab visible, everything on screen. |
| 7 | Flexibility and Efficiency | 3 | Inline editing + search + date filters (strong), but filtered results can't page and there's no column sorting UI. |
| 8 | Aesthetic and Minimalist | 3 | Tables are clean but the left-aligned bare amounts look unfinished. |
| 9 | Error Recovery | 3 | Inline edit reverts on cancel; save toasts. |
| 10 | Help and Documentation | 3 | Section descriptions ("View and manage your expense transactions"). |
| **Total** | | **32/40** | **Good — powerful surface, table money presentation is the drag** |

## Anti-Patterns Verdict

Deterministic scan: **zero non-test findings.** No slop. This is a capable, power-user surface — the strongest *efficiency* surface in the app (inline-editable tables on desktop, a filtered card/drawer flow on mobile). The failure mode is, again, **reskin drift** — the Monospace Money treatment reached the mobile cards but not the desktop tables.

*(Browser visualization not run — no automation this session. Assessment B is the deterministic scan only.)*

## Overall Impression

The responsive split is genuinely considered: desktop gets dense **inline-editable tables**, mobile gets a **search + card + drawer** flow. Both have excellent states. The single biggest opportunity: **make the desktop table amounts read like money** — right-aligned, monospaced, with the peso convention — so the tables match the mobile cards and the rest of the reskinned app.

## What's Working

1. **Two real, distinct responsive experiences** — inline-editable `@tanstack/react-table` on desktop; debounced search + date filters + `CompactTransactionCard` + edit drawers on mobile. Not a squished single layout.
2. **State handling** — skeletons, empty states, filtered counts, load-more, per-tab loading disables. Consistent with the app's strongest trait.
3. **Inline editing** — edit-in-place with per-row edit/cancel is a strong power-user affordance.

## Priority Issues

- **[P1] Desktop table amounts are bare, non-mono, and left-aligned.** `ExpenseTable`'s read-only amount cell (line 84) renders `amount.toLocaleString('en-US', …)` — no `.text-numeric`, no ₱, and the cell isn't right-aligned. An amount column is *the* place tabular figures and right-alignment matter (you scan it vertically). Applies to all three tables (Expense / Income / Transfer twins). Fix: `.text-numeric`, right-align the amount column, decide the ₱ convention (per-cell prefix or column header). → `/impeccable typeset` + `layout`

- **[P1] Mobile ↔ desktop currency mismatch.** The same transaction shows as `₱1,234.00` (monospace) on the mobile card but `1,234.00` (plain sans, left) in the desktop table. This is exactly the inconsistency the reskin set out to remove — and it's the same data one breakpoint apart. Fix rolls up into the P1 above. → `/impeccable clarify`

- **[P2] "Load More" is hidden while filtering (mobile).** Filtered results are capped at the first 15 with no way to page further (`!isFiltering && hasMore`). Search returning 50 matches shows 15 and stops. Fix: allow load-more (or paginated fetch) for filtered results too. → feature / `harden`

- **[P2] Mobile view is three near-identical tab blocks.** `TransactionsMobileView` triplicates state + markup for expenses/income/transfers (~500 lines). Not a visual bug, but a drift risk — a fix to one tab can silently miss the others. Fix: extract one generic transaction-tab component. → refactor (code hygiene)

## Persona Red Flags

**Alex / The Owner (power user, the sole user):**
- Inline editing is excellent, but **no column sorting** on dense tables (can't sort by amount/date).
- **Filtered searches can't page** past 15 on mobile.
- Bare, left-aligned amounts make scanning a column for a value harder than it should be.

**Sam (accessibility):**
- Tables use real `<TableHeader>`/`<TableHead>` semantics (good). Worth verifying **keyboard flow into inline-edit cells** and focus management on save/cancel — inline-editable grids are a common a11y weak spot.

## Minor Observations

- Amount column has **no ₱ anywhere** (not per-row, not in the header) — the number's meaning is implied by context only.
- Pagination footer uses `border border-border border-t-2` — a slightly heavy double top border.
- No visible sort affordance even though `@tanstack/react-table` supports it.

## Questions to Consider

- Should a transaction's amount look identical whether you're on the phone or the desktop table?
- On a table you edit daily, is sorting by amount/date worth adding?
- Why can you page through *all* transactions but only the *first 15* of a filtered search?
