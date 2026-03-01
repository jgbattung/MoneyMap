# Optimization Spec: Data Fetching and Caching

## 1. Objectives & Scope
**Objective:** Fix slow page loads and missing cache invalidations across the application (v1.1 Phase 1).
**Scope:**
- Investigate and fix Next.js 15 route caching for all `GET` API routes (`src/app/api/...`).
- Audit and ensure query key matching for `@tanstack/react-query` `invalidateQueries` in custom hooks.
- Audit Prisma queries for potential `include` bloat or N+1 issues that are slowing down data fetching.
- **Out of Scope:** Making visual UI changes or adding new features. We are strictly optimizing existing data flows.

## 2. Actionable Implementation Steps

### A. Next.js Route Caching (The "Refresh needed" bug)
- **Problem:** Data fetched via Next.js API Routes might be cached aggressively or improperly by Next.js.
- **Action:** Ensure API routes in `src/app/api/` that depend on real-time data (e.g., `expense-transactions`, `transactions/recent`, `monthlySummary`) are dynamically pulling fresh data (e.g., adding `export const dynamic = 'force-dynamic';` if needed).

### B. React Query Cache Invalidations
- **Problem:** When mutations (Create/Update/Delete) succeed, the UI doesn't always update immediately.
- **Action:** Audit hooks like `useExpenseTransactionsQuery.ts`, `useRecentTransactions.ts`, etc. Ensure that `queryClient.invalidateQueries({ queryKey: [...] })` is correctly structured to invalidate active fuzzy keys. Confirm no critical query keys were misspelled or omitted in `onSuccess` handlers.

### C. Prisma Query Optimization
- **Problem:** Pages take "quite a while to fetch data."
- **Action:** Review `findMany` calls in the API route handlers. Ensure that `include` is only fetching required relation data. If dashboard summaries are calculating totals in JavaScript, refactor them to use Prisma `groupBy` or `aggregate`.

## 3. Verification Plan
- For cache invalidations: Log into the app, create/edit an expense transaction in the UI, and verify that it appears instantly without a manual browser refresh.
- For speed optimization: Check the network tab to ensure API response times are snappier.
- Claude Code MUST write a verification document `/docs/optimization-verification.md` detailing which routes/hooks were fixed and their resulting behavior.
