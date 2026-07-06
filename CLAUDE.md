# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MoneyMap: single-user personal finance tracker (net worth, accounts, cards, transactions, budgets, installments, reports). Next.js 15 App Router, Prisma + Supabase Postgres, better-auth, TanStack Query v5, Tailwind v4 + shadcn. Vercel functions pinned to `sin1` next to the DB (`vercel.json`) - keep queries parallel, never serial. Product/brand definition in `PRODUCT.md` / `DESIGN.md`.

## CRITICAL: Database Safety

`.env` points at the **live production DB** with real financial data. NEVER run `prisma migrate`, `db push`, or `db seed` - write migrations but have the user run them manually. Safe: `prisma generate/validate/format`. Exception: E2E tests use an isolated local Postgres (`docker-compose.yml`, port 5433 via `playwright/.env.test`) where Playwright setup/CI applies migrations automatically.

## Commands

```bash
npm run dev / lint / build            # build is the type check
npx vitest run [file] [-t "name"]     # unit tests; use npx (vitest not on PATH on Windows)
docker compose up -d && npm run test:e2e
```

- **Never install `@vitejs/plugin-react`** - its vite@7 brings a second postcss that breaks Tailwind in the dev server. JSX comes from `esbuild: { jsx: 'automatic' }` in `vitest.config.mts`; fix that config if tests say "React is not defined".
- Many `*.test.tsx` assert on markup - keep the suite green when changing a surface.

## Invariants

Detailed pattern guides live next to the code and load automatically when working there: `src/app/api/CLAUDE.md` (route anatomy, mutation/balance pattern, installments, cron) and `src/hooks/CLAUDE.md` (query keys, optimistic mutation recipe, invalidation rules). Cross-cutting rules:

- **Atomicity:** mutations batch denormalized balance updates (`FinancialAccount.currentBalance`) + record writes in one `db.$transaction([...])`. Never weaken.
- Prisma Decimals serialize as **strings** in JSON; caches store amounts as strings - `parseFloat` before math, write back as string.
- Aggregate queries filter `isInstallment: false` (installment parents would double-count).
- Report endpoints cap `take` at 50 - paginate by advancing `skip`, never by growing `take`.
- Middleware only guards pages, not `/api` - every route does its own session check.
- Schema debt: `TransferTransaction.amount` is `Float` (everything else `Decimal(15,2)`); fix requires a user-run migration.

## Design System

- **Dark-only**; light `:root` tokens are placeholders. Palette = OKLCH vars in Tailwind v4 `@theme` - change tokens, never per-component colors.
- Money: `₱` + `.text-numeric` (Geist Mono, tabular-nums). Category chart colors via `getCategoryColor` in `src/lib/chart-colors.ts`, not index-based palettes.
- Skeleton fill is single-sourced in `src/components/ui/skeleton.tsx` - no per-usage bg overrides.
- Gain/loss uses semantic tokens (`text-text-success/error`) always paired with a sign/arrow cue.

## Workflow

- Never commit to `main` - branch first (`feature/`, `fix/`, `docs/`, `refactor/`) before writing files.
- `.gsd/` is gitignored agent state. Read `.gsd/project-context.md` before significant work; append durable findings to it.
