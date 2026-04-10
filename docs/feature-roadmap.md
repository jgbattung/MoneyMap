# Money Map — Feature Roadmap

> Last updated: 2026-04-07
> This document tracks planned features and improvements. Update it whenever a feature is started, completed, or reprioritized.

---

## Status Legend

| Status | Meaning |
|--------|---------|
| 🔲 Planned | Not yet started |
| 🔄 In Progress | Currently being worked on |
| ✅ Done | Shipped |

---

## Tier 1 — Foundational (Highest ROI)

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | **Better empty states** | ✅ Done | Shared `EmptyState` component with icon, heading, description, and optional CTA. Covers full-page, dashboard widget, and table/list contexts across ~19 locations. 21 tasks shipped, 934 tests green. |
| 2 | **Dashboard redesign** | ✅ Done | Shared `PageHeader` component (title + actions slot) replaces duplicated h1 headers across all 10 list pages. `UserMenu` dropdown (avatar + name/email + Settings placeholder + Logout) added to header right side; Sidebar user section removed. `MobileHeroSummary` surfaces monthly income/expenses/net savings at the top of the mobile dashboard (2+1 card grid); `MonthlySummaryChart` hidden on mobile to avoid duplication. 4 phases, 22 tasks shipped, 999 tests green. **Header polish follow-on:** `PageHeader` refactored to two-row layout with divider; converted to sticky (`sticky top-0 z-10`). New `MobileDetailHeader` shared component (sticky, with back-link slot) applied to Account Detail, Card Detail, and Card Group Detail pages. 1036 tests green. |
| 3 | **Optimistic updates — transactions** | ✅ Done | Optimistic create and delete for expenses, income, and transfers. 9 phases total: Phases 1–5 implemented the core optimistic pattern (onMutate/onError/onSettled, fire-and-forget mutations, instant toast + UI close). Phase 7 fixed snapshot corruption (undefined `getQueriesData` entries) and removed stale `isDeleting` props. Phase 8 gated single-transaction queries behind drawer `open` state to prevent cross-endpoint 404s in `TransactionsMobileView`. Phase 9 added `isListQuery` predicates to all `cancelQueries`/`getQueriesData`/`setQueriesData` calls to fix a query key collision where `setQueriesData` accidentally matched single-transaction cache entries, crashing `onMutate` with a TypeError. 74 new tests, 1094 total green. Accounts and cards optimistic updates remain planned separately. |
| 3b | **Optimistic updates — accounts + cards** | 🔲 Planned | Extend the same optimistic create/delete pattern to accounts and cards. Separate effort from transactions. |
| 4 | **Undo actions via toast** | 🔲 Planned | Add an undo button to Sonner delete toasts. Short delay (e.g. 5s) before actual deletion executes. Pairs naturally with optimistic updates. |

---

## Infrastructure & Reliability

| # | Item | Status | Notes |
|---|------|--------|-------|
| I1 | **PgBouncer-compatible batch transactions** | ✅ Done | All 15 Prisma interactive transactions (`db.$transaction(async (tx) => {...})`) converted to batch form (`db.$transaction([...])`). Root cause: Supabase Transaction mode pooler (port 6543) can reassign the backend Postgres connection between statements in an interactive transaction, causing P2028 errors. Batch form sends all ops in one round-trip. 6 conversion patterns (A–F), 16 tasks shipped, 205 tests updated/added, 1303 tests green. Merged via PR #134. |

---

## Tier 2 — Core Feature Improvements

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 5 | **Reports: Transaction Analyzer** | ✅ Done | Full-featured Transaction Analyzer on the Reports page. Filter form with date range, type (income/expense), category, subcategory (animated reveal), amount range, and tags. Results display: inline summary stats (total amount + avg per transaction) with vertical divider, subcategory breakdown table, and matching transactions list with Load More (remaining count + skeleton loading). UI polish: mobile-dense form layout, collapsible filters, filter pill interaction states, conditional section separators. `useTransactionAnalysis` hook with TanStack React Query. 12 tasks shipped, merged via PR #130. |
| 6 | **Monthly income vs. expense trend chart on dashboard** | 🔲 Planned | A 6–12 month income-vs-expense bar or line chart visible on the dashboard so users get trend awareness at a glance without going to Reports. |
| 7 | **Advanced table filtering** | 🔲 Planned | Currently: search + 3 date presets. Add: simultaneous multi-filter support (account, category/type, tag, amount range, custom date range) on expense, income, and transfer tables. |
| 8 | **Mobile header with back button navigation** | ✅ Done | Delivered as Phase 4 of Dashboard Redesign (Tier 1 #2). Back links with explicit `href` added inside gradient card headers on account detail, card detail, and card group detail pages. Mobile-only (`md:hidden`), links to parent route (`/accounts` or `/cards`). |

---

## Tier 3 — Extended Features

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 9 | **Recurring transactions management UI** | 🔲 Planned | Backend already processes installments via cron. Add a UI to view, manage, and cancel active recurring/installment transactions. |
| 10 | **Budget period insights** | 🔲 Planned | Budgets are currently month-scoped with no history. Add a 3–6 month trend per budget category (e.g. "You spent 20% less on Food vs. your average"). |
| 11 | **Bulk actions in tables** | 🔲 Planned | Add checkbox selection to tables for bulk delete and bulk tag assignment. Natural complement to advanced filtering. |
| 12 | **Data export (CSV)** | 🔲 Planned | Export filtered transaction data as CSV. Useful for taxes and external records. |
| 13 | **Keyboard shortcuts** | 🔲 Planned | Quick-add transactions, page navigation shortcuts. Desktop power user polish. |
