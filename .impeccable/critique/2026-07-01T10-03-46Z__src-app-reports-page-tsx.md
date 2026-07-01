---
target: reports
total_score: 32
p0_count: 0
p1_count: 2
timestamp: 2026-07-01T10-03-46Z
slug: src-app-reports-page-tsx
---
# Critique: Reports (`src/app/reports/page.tsx`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Skeleton / empty / error+retry states everywhere, load-more spinners. Excellent. |
| 2 | Match System / Real World | 4 | Natural-language summary sentences ("You spent ₱X across Y transactions on Z"). Strong. |
| 3 | User Control and Freedom | 4 | Removable filter chips, Clear buttons, cancel, add-transactions panel. Strong. |
| 4 | Consistency and Standards | 2 | Currency via `Intl` (no `.text-numeric`); raw `text-red-500`/`green-500` vs semantic tokens; rainbow chart colors vs palette. |
| 5 | Error Prevention | 3 | Date pickers block future dates; selects constrain input; Analyze disabled while fetching. |
| 6 | Recognition Rather Than Recall | 4 | Active-filter chips, everything labeled and visible. |
| 7 | Flexibility and Efficiency | 3 | Rich filtering + load-more, but no saved/recent queries; Enter-to-search only in one spot. |
| 8 | Aesthetic and Minimalist | 2 | Rainbow `hsl()` chart colors + a long stacked wall of 5 big cards + non-mono numbers fight the calm/precise identity. |
| 9 | Error Recovery | 3 | Retry buttons; raw `{error}` shown (acceptable for a single dev-user). |
| 10 | Help and Documentation | 3 | CardDescriptions explain each tool; summary sentences teach. Above average. |
| **Total** | | **32/40** | **Good — strong UX, held back by design-system drift** |

## Anti-Patterns Verdict

Detector flagged **undocumented `hsl()` colors** (advisory) — the real hits are `generateColor()` in `CategoryBreakdownChart` and `TransactionAnalyzer`, which emit `hsl(hue, 65%, 60%)` rainbow hues. Not slop exactly, but off-brand drift: a saturated rainbow on a calm, rationed teal/brass identity.

The reports page reads as **well-engineered UX that predates the reskin** — the "Deep Teal, Refined" pass and the Monospace Money / Two-Reds rules never reached these components. The failure mode is drift, not incompetence.

*(Browser visualization not run — no automation this session. Assessment B is the deterministic scan only.)*

## Overall Impression

The two analyzer tools (`TransactionAnalyzer`, `EventLedger`) are the most sophisticated UX in the app — progressive disclosure, filter chips, summary sentences, load-more, an inline add-transactions panel. The single biggest opportunity: **pull these components onto the design system** so Reports looks as considered as it behaves. This is a reskin-rollout gap, not a redesign.

## What's Working

1. **State handling + copy are best-in-class.** Every panel has skeleton/empty/error/retry, and the natural-language summaries ("You spent ₱X across Y transactions…") are genuinely great UX.
2. **Progressive disclosure done right.** Tier-1 filters always visible; Tier-2 collapse on mobile behind a "More Filters (N active)" toggle. Textbook.
3. **Filter chips.** Active filters render as removable badges — strong recognition-over-recall.

## Priority Issues

- **[P1] Rainbow `hsl()` chart colors, index-based.** `generateColor(index, total)` returns evenly-spaced rainbow hues in both breakdown charts. Two problems: (a) it's off-palette — a saturated rainbow against the rationed teal/brass identity; (b) it's **index-based, so a category's color changes with the result set** — the same category is a different color across views, destroying color-as-identity. Fix: a curated categorical palette derived from the design tokens (teal/brass/slate/success + a few token-tinted steps), keyed by category id so colors are stable. → `/impeccable colorize`

- **[P1] Currency ignores the app's money conventions.** `TransactionAnalyzer` and `EventLedger` format via `Intl.NumberFormat` (PHP) in plain sans — no `.text-numeric`, no tabular figures. Summary stats and transaction amounts don't align, and it's a second formatting path vs the rest of the app. Fix: route through the shared `formatCurrency` + apply `.text-numeric`. → `/impeccable typeset` / `clarify`

- **[P2] Raw `text-red-500` / `text-green-500` in EventLedger.** Expense/income amounts use raw Tailwind reds/greens instead of the semantic `text-text-error` / `text-text-success` tokens the reskin established — and raw `red-500` is the alarm red, so this violates the **Two-Reds Rule** for ordinary amounts. Fix: swap to the semantic tokens. → `/impeccable colorize` / `polish`

- **[P2] The page is one long wall of five big cards.** NetWorth → Category Breakdown → Annual Summary → Transaction Analyzer → Event Ledger, all full-width, all loaded at once. On a dense analytics surface this is a lot of scrolling with no way to jump. Consider light sectioning / anchors / a sticky sub-nav. (Lower priority — a single power user may prefer one scroll.) → `/impeccable layout`

## Persona Red Flags

**Alex / The Owner (power user, the sole user):**
- Rich filters, but every analysis starts from scratch — no saved or recent queries on a tool built for repeat analysis.
- The index-based chart colors mean "Groceries" isn't a stable color run-to-run; can't build visual memory of categories.

**Sam (accessibility):**
- Good: EventLedger pairs +/− signs with color, so gain/loss isn't hue-only.
- Watch: raw `text-red-500`/`green-500` on the dark card weren't tuned for this background like the semantic tokens were; verify contrast. The rainbow chart segments lean on hue alone (labels are present, so acceptable).

## Minor Observations

- Two identical `generateColor` and `formatCurrency` helpers duplicated across `TransactionAnalyzer` and `EventLedger` — consolidate.
- `AnnualSummaryTable` already uses `.text-numeric` (from the rollout), so within one page some tables align and others don't — the inconsistency is visible side by side.
- Enter-to-search works in EventLedger's add-panel but not the main analyzers.

## Questions to Consider

- What if every category had one stable, on-brand color everywhere it appears (chart, breakdown, legend)?
- Does a five-card scroll serve a daily user, or would tabs/anchors make Reports feel less like a data dump?
- Should the analyzers remember your last query?
