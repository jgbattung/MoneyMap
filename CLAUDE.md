# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

MoneyMap is a **single-user personal finance tracker** (net worth, accounts, credit cards, expenses/income/transfers, budgets, installments, reports). It is a private instrument for one known operator, not a multi-tenant SaaS - see `PRODUCT.md` and `DESIGN.md` for the product/brand definition ("calm, trustworthy, precise").

Stack: Next.js 15 (App Router) + TypeScript, Prisma + Supabase Postgres (ap-southeast-1), better-auth, TanStack Query v5, Tailwind v4 + shadcn (new-york), Vitest + Playwright. Deployed on Vercel with functions pinned to `sin1` (`vercel.json`) to sit next to the database - keep it that way.

## CRITICAL: Database Safety

The `.env` `DATABASE_URL` points at the **live production database** holding real financial data. There is no staging DB.

- **NEVER run** `prisma migrate dev/deploy/reset`, `prisma db push`, or `prisma db seed`. If a task requires a schema change, write the migration but stop and have the user run it manually.
- Safe: `prisma generate`, `prisma validate`, `prisma format`.
- E2E tests are the exception: they run against an isolated local Postgres (`docker-compose.yml`, port 5433, wired via `playwright/.env.test`), where migrations are applied automatically by the Playwright setup and CI.

## Commands

```bash
npm run dev              # dev server (localhost:3000)
npm run lint
npm run build            # also the type check - run before committing
npx vitest run           # unit tests (use npx - vitest is not on PATH on Windows)
npx vitest run src/hooks/useNetWorth.test.ts   # single file
npx vitest run -t "creates an expense"          # single test by name
docker compose up -d && npm run test:e2e        # Playwright E2E (needs local DB)
```

### Testing gotchas

- **Never install `@vitejs/plugin-react`** - it pulls in `vite@7` with a second `postcss`, which conflicts with Next.js's internal postcss and breaks Tailwind in the dev server. JSX is handled by `esbuild: { jsx: 'automatic' }` in `vitest.config.mts`; if tests fail with "React is not defined", fix that config instead.
- Unit tests use happy-dom + @testing-library/react. Many `*.test.tsx` files assert on current markup - keep the full suite green whenever you change a surface.
- E2E tests share one database, so Playwright runs with `workers: 1`.

## Architecture

### API layer (`src/app/api/**/route.ts`)

- Every route exports `const dynamic = 'force-dynamic'` and follows: `auth.api.getSession` -> zod validation -> Prisma. Middleware (`src/middleware.ts`) only guards pages; API routes do their own auth check.
- **Atomicity invariant (never weaken):** mutations batch balance updates + record writes in a single `db.$transaction([...])`. Account balances are denormalized (`FinancialAccount.currentBalance`) and must move in lockstep with transaction rows.
- Credit-card statement recalculation is deferred post-response via `after()` from `next/server` (`src/lib/statement-recalculator.ts`). Daily cron endpoints under `/api/cron/*` are hit by GitHub Actions workflows with a `CRON_SECRET` bearer token.
- **Decimals serialize as strings** in API JSON (Prisma Decimal). Client caches store `amount`/`currentBalance` as strings: `parseFloat` before arithmetic, write back as string.
- Cross-region latency history: every sequential DB round-trip used to cost a cross-Pacific hop before the `sin1` pin. Keep independent queries parallel (`Promise.all` / batched `$transaction`), never serial.

### Client data layer (`src/hooks/`)

- One query hook per domain (`useNetWorth`, `useAccountsQuery`, `useExpenseTransactionsQuery`, etc.). Global Query defaults in `src/app/providers.tsx` (staleTime 10m, gcTime 15m, retry 1, no refetchOnWindowFocus).
- **Post-write invalidation is centralized** in `src/hooks/transactionInvalidations.ts`: `EAGER_KEYS` refetch immediately; `DEFERRED_KEYS` are marked stale with `refetchType: 'none'`. Route new invalidations through it.
- **Optimistic update pattern** (all transaction create/update/delete mutations): `onMutate` cancels queries, snapshots via `getQueriesData`, patches lists + account balances (shared helper `src/hooks/optimisticBalances.ts`); `onError` restores snapshots; `onSettled` invalidates. Optimistic rows use `optimistic-${crypto.randomUUID()}` ids merged with the real id in `onSuccess`.
- Report widgets (`useTransactionAnalysis`, `useEventLedger`) use an **explicit-trigger pattern**: `enabled: false` + `refetch()` after setting the params object (which is the query key). Data loads only on button click - preserve this.

### Domain invariants

- **Installments:** installment parents have `isInstallment: true`; every report/aggregate query filters `isInstallment: false` to avoid double-counting. Keep new aggregate queries consistent.
- **Pagination:** report list endpoints cap `take` at 50 in their zod schemas. Paginate by advancing `skip`, never by growing `take`.
- **Tags** (`Tag`) are the only cross-model M2M (expense + income + transfer). Categories (`ExpenseType`/`IncomeType`) are single-valued per transaction and cannot represent cross-type events. Prisma `updateMany` cannot `connect` relations - batch tag attachment needs individual `update` calls inside `db.$transaction([...])`.
- **Known schema debt:** `TransferTransaction.amount` is `Float` while every other money column is `Decimal(15,2)`. Fixing it requires a user-run migration.

### Design system

- **Dark-only.** Light `:root` tokens in `globals.css` are placeholders; do not build light-mode support. Tokens are OKLCH CSS vars in Tailwind v4 `@theme` - palette changes go through the token layer, never per-component.
- All currency figures use `₱` and the `.text-numeric` utility (Geist Mono + tabular-nums).
- Category chart colors come from `getCategoryColor(key)` in `src/lib/chart-colors.ts` (stable hash-derived OKLCH) - no index-based palettes.
- Skeleton fill is single-sourced in `src/components/ui/skeleton.tsx`; don't re-add per-usage `bg-*` overrides, and only the `Skeleton` primitive uses `animate-pulse`.
- Gains/losses use semantic tokens (`text-text-success` / `text-text-error`) and are always paired with a sign/arrow cue, never hue alone. Motion respects `prefers-reduced-motion`; shared easing lives in `src/lib/motion.ts` + `globals.css`.

## Workflow

- **Never commit to `main`.** Branch first - before writing any files - using `feature/`, `fix/`, `docs/`, `refactor/` + short description. Conventional Commits for messages and PR titles. No AI co-author or "Generated with" trailers.
- `.gsd/` is gitignored agent working state (specs, plans, logs). **Read `.gsd/project-context.md` before significant work** - it is the living knowledge base and should be appended to (never rewritten) when you learn something durable. Completed feature docs move to `.gsd/archive/`.
- After code work: lint, build, run the affected tests, then commit.
