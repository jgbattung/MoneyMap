---
target: loading states, skeletons, page transitions
total_score: 0
p0_count: 0
p1_count: 1
timestamp: 2026-07-01T14-30-39Z
slug: app-loading-states-and-skeletons
---
# Critique: Loading States, Skeletons & Page Transitions (app-wide)

Focus: the *async experience* — how the app feels while data and routes load — rather than any single page.

## Design Health (focused)

The relevant Nielsen heuristic here is **#1 Visibility of System Status**. On coverage it's excellent; on consistency it's the weak spot.

| Dimension | Rating | Note |
|---|---|---|
| Coverage (does every async surface have a loading state?) | **4/4** | Skeletons virtually everywhere; almost no bare spinners-in-content. |
| Layout fidelity (skeleton matches loaded content → low CLS) | **4/4** | 30 purpose-built `Skeleton*` components mirror their real cards. |
| Visual consistency (do loading states look the same everywhere?) | **2/4** | Two different skeleton fills in play (see P1). |
| Navigation feedback (page transitions) | **3/4** | Top-loader bar + persistent shell; no route-level skeleton. |
| Transition smoothness (skeleton → content) | **2/4** | Hard swap, no crossfade. |

## Anti-Patterns Verdict

Deterministic scan: **clean** — but the detector hunts visual slop, which isn't the relevant lens for loading UX. The real issue isn't slop, it's **inconsistency in an otherwise strong system.** No spinners-in-content, no dated shimmer sweeps (calm `animate-pulse` throughout, on-brand). *(No browser this session — assessment is static + code review.)*

## Overall Impression

This is one of the app's genuine strengths — near-total skeleton coverage, purpose-built per card type so content doesn't jump when it arrives. The single biggest opportunity is **making the skeletons themselves consistent**: right now the primitive's default fill is wrong, so the app compensates with ~184 manual overrides — and the ~20 places that forget the override render a nearly-invisible loading state.

## What's Working

1. **Comprehensive, purpose-built skeletons.** 30 dedicated `Skeleton*Card/Table` components (plus many inline) that mirror their real layouts, so loading→loaded has minimal layout shift. This is the hard part, and it's done well.
2. **Calm, on-brand motion.** Everything uses `animate-pulse` — no shimmer sweeps or spinners in content. Matches the "calm, precise" register and the product-register rule "skeleton states, not spinners."
3. **Stable navigation shell.** The sidebar/bottom-bar persist across route changes (client-rendered pages), and the teal `NextTopLoader` gives navigation feedback — no full-page white flash between routes.

## Priority Issues

- **[P1] Two skeleton fills — the primitive default is near-invisible.** `ui/skeleton.tsx` defaults to `bg-accent`, which the reskin defines as `oklch(1 0 0 / 10%)` (10% white — barely visible on the dark card). The codebase works around this by overriding to `bg-secondary-500` in **~184 places**, but **~20 usages don't** (e.g. `MobileHeroSummary`, the reports `LoadingSkeleton`/`LedgerLoadingSkeleton`, several `h-20`/`h-[52px]` blocks) — those render as a faint ghost while the rest render as solid slate. Same app, two loading looks, and the faint one reads as "broken/empty."
  - **Fix:** make the intended skeleton fill the **primitive default** (a dedicated `--skeleton` token, or bake `bg-secondary-500` into `Skeleton`), then delete the ~184 overrides. One source of truth; impossible to get wrong. → `/impeccable polish` (design-system consolidation)

- **[P2] Two skeletons bypass the primitive entirely.** `NetWorthHistoryChart` and `TransferTypesList` hand-roll `animate-pulse` divs instead of using `<Skeleton>`. They won't inherit a primitive fix and are a second construction pattern. → fold into `<Skeleton>`.

- **[P2] No route-level `loading.tsx` (no Suspense boundary).** Page transitions rely entirely on the 3px top bar + each page's client-side component skeletons. That's a *reasonable* choice for a fully client-fetched app (the shell stays, components self-skeleton) — but there's no navigation-level skeleton, and the 3px bar is subtle. On a slow connection, a heavy page (e.g. Reports) can briefly look like an empty shell before its components mount their skeletons. Consider a lightweight `loading.tsx` for the heaviest routes, or accept it deliberately. → observation / `harden`

- **[P3] Hard skeleton→content swap.** Every surface is `isLoading ? <Skeleton/> : <Content/>` — an instant snap. Where the skeleton doesn't perfectly match the content, the pop is noticeable. A ~150ms crossfade would smooth it. Keep it subtle (calm register). → `/impeccable animate`

## Minor Observations

- The skeleton fill (`bg-secondary-500`, cool slate) is slightly off the reskin's teal-tinted surfaces — a token derived from the surface would sit better than raw slate.
- `NextTopLoader` at `height={3}` is easy to miss on fast transitions; not a bug, just quiet.

## Persona Red Flags

**Casey (distracted mobile, slow connection):** on 3G, the faint `bg-accent` skeletons (the ~20 non-overridden ones) may read as a blank/broken screen rather than "loading." The purpose-built slate skeletons don't have this problem — which is exactly why the inconsistency matters.

**Riley (stress tester):** flips between tabs/routes rapidly — will notice the loading look changes depending on which component is on screen (faint vs slate), and the hard content pop.

## Questions to Consider

- Should there be exactly **one** skeleton color, owned by the primitive, that no one can forget?
- Is a 3px top bar enough feedback for navigating into a data-heavy route, or should the heaviest routes get a real loading skeleton?
- Would a 150ms crossfade make "loaded" feel like an arrival rather than a snap?
