# Money Map

A single-user personal finance tracker built for one person's actual money: net worth, accounts, credit cards, transactions, budgets, installments, and reports, in one calm dark interface.

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-brass?color=b8863b)](LICENSE)

> **Heads up:** this is a personal instrument, not a product. It runs in production for exactly one user (me), and the codebase assumes that. It is public because the engineering may be useful to read, not because it is ready for you to sign up. See [Status](#status).

---

## Table of Contents

- [What it does](#what-it-does)
- [Screenshots](#screenshots)
- [What it deliberately does not do](#what-it-deliberately-does-not-do)
- [What is different about it](#what-is-different-about-it)
- [How it works](#how-it-works)
- [Main features](#main-features)
- [Bonus features](#bonus-features)
- [Domain concepts](#domain-concepts)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Running it locally](#running-it-locally)
- [Demo data](#demo-data)
- [Testing and CI](#testing-and-ci)
- [Scheduled jobs](#scheduled-jobs)
- [Design system](#design-system)
- [Status](#status)
- [License](#license)

---

## What it does

Money Map answers one question on every screen: **where do I stand right now, and which way am I trending?**

It is a manual-entry ledger with a denormalized balance layer on top. You record what actually happened to your money (expenses, income, transfers between your own accounts), and the app keeps every account balance, credit card statement, budget, and net worth figure correct as a consequence. Nothing is estimated and nothing is synced from a bank. The numbers are exactly what you told it, aggregated honestly.

Concretely, it tracks:

- **Financial accounts** across 11 types: checking, savings, credit card, investment, cash, crypto, retirement, real estate, payroll, e-wallet, other.
- **Four transaction kinds**: expenses, income, transfers between your own accounts, and installment plans.
- **Credit cards** with real statement cycles, statement balances, and due dates.
- **Budgets** as monthly limits per expense category, and monthly targets per income category.
- **Net worth** over time, with a target you can set and track progress against.
- **Reports**: category breakdowns, annual summaries, a filterable transaction analyzer, and a tag-based event ledger.

Currency is Philippine peso (`₱`), formatted with the `en-PH` locale.

## Screenshots

Captured from the synthetic demo dataset, not from real financial records, against a
production build (`npm run build && npm run start:demo`) so there is no dev-mode
indicator in frame. Regenerate them with `npm run screenshots`, as described under
[Demo data](#demo-data).

| | |
| --- | --- |
| ![Dashboard](public/screenshots/desktop/dashboard.png) | ![Net worth](public/screenshots/desktop/net-worth.png) |
| **Dashboard.** Net worth, the change since last month, account balances and recent activity in one view. | **Net worth.** Total net worth over time against a target, with the 1-year period selected. |
| ![Accounts](public/screenshots/desktop/accounts.png) | ![Card detail](public/screenshots/desktop/card-detail.png) |
| **Accounts.** Balances across checking, savings, cash, e-wallet, investment and retirement accounts, with the net-worth flag per account. | **Card detail.** A single credit card's statement balance, statement date and transactions. |
| ![Transactions](public/screenshots/desktop/transactions.png) | ![Calendar](public/screenshots/desktop/calendar.png) |
| **Transactions.** Expenses, income and transfers in one filterable table with inline editing. | **Activity calendar.** A day with activity selected, showing its transactions in the detail panel. |
| ![Budgets](public/screenshots/desktop/budgets.png) | ![Reports](public/screenshots/desktop/reports.png) |
| **Budgets.** A monthly limit per category, updating as expenses are recorded. | **Reports.** Category breakdown and the annual summary. |
| ![Event ledger](public/screenshots/desktop/event-ledger.png) | |
| **Event ledger.** Expenses and income merged under one tag, so a trip's real cost includes whatever came back. | |

A matching mobile set, captured on a real device profile (390x844) rather than a narrow
desktop viewport, lives under `public/screenshots/mobile/` with the same file names.

## What it deliberately does not do

Being explicit here is more useful than a feature list, because most of these are choices rather than gaps.

| Not supported | Why |
| --- | --- |
| **Bank / Plaid / open-banking sync** | Every transaction is entered by hand. Manual entry is the point: it forces you to actually look at each expense, which is the behavioral half of the tool. It also means no third party ever holds credentials to my accounts. |
| **Multi-tenant SaaS** | One known user. Auth exists so the app is not open to the internet, not to serve an audience. Every query is still scoped by `userId`, so the data model would survive multi-user, but nothing else is built for it. |
| **Multi-currency** | Single currency, single country. FX conversion, rate history, and per-account currency would be significant complexity for zero current benefit. |
| **Investment performance tracking** | Investment, crypto, and retirement accounts are tracked as **balances only**. No holdings, no cost basis, no ticker prices, no gain/loss attribution. Net worth cares what the account is worth today; the app does not try to be a brokerage. |
| **CSV / OFX import or export** | Not built. Import would undercut the deliberate-entry premise, and there is no second system to export to yet. |
| **Receipt scanning, OCR, or AI categorization** | Categories are chosen by a human who knows what the purchase was for. |
| **Onboarding, marketing surface, or empty-state hand-holding** | The single user already knows what net worth and a statement cycle are. Density and precision are treated as assets, not obstacles. |
| **A light theme** | Dark only. The light `:root` tokens in the stylesheet are placeholders and are not maintained. |
| **Native mobile apps** | Responsive web, with a genuinely separate mobile layout, not a squeezed desktop one. |

## What is different about it

Most personal-finance side projects are a transactions table with a pie chart. The parts of this one that took real thought:

**Balances are denormalized, and mutations are atomic.** Recomputing every balance from the full transaction history on each read is a nice idea that gets slow fast. Instead `FinancialAccount.currentBalance` is a stored column, and every mutation writes the balance delta **and** the transaction record inside one `db.$transaction([...])`. Either both land or neither does. There is no code path in the app that can write a transaction without moving the balance with it.

**Credit cards model real statement cycles, not just a balance.** A card carries a statement day and a due day. The app computes the statement balance for a cycle as `previous balance + expenses + non-payment transfers out - income/credits - card payments`, rolls the previous cycle forward, and recalculates automatically whenever any transaction inside that cycle changes. That recalculation runs **after** the HTTP response via Next.js `after()`, so editing an expense never waits on statement math. Editing a transaction's date recalculates both the old and the new cycle.

**Installments are a first-class plan, not a pile of duplicated rows.** A 12-month plan is one parent record that never counts toward any aggregate, plus child payments generated one per month by a scheduled job. Every report and summary query filters `isInstallment: false`, which is what keeps the parent from double-counting against its own children.

**Optimistic mutations that model the actual accounting.** The client does not just prepend a row and hope. `src/hooks/optimisticBalances.ts` mirrors the server's balance semantics exactly (expense negative, income positive, transfer negative-from/positive-to/negative-fee, edits reverse the old effect before applying the new one), so account balances, budget spend, and net worth all move the instant you submit, then reconcile against server truth. Optimism is best-effort by design: helpers no-op on caches that were never populated, so correctness never depends on the optimistic path.

**Infrastructure placed for latency, not defaults.** Vercel functions are pinned to `sin1` (Singapore) via `vercel.json` to sit next to the Supabase Postgres in `ap-southeast-1`. Before that, functions defaulted to US East and every request paid a trans-Pacific round trip per query. Independent reads still run through `Promise.all` rather than sequential `await`s, which was this app's single largest historical performance bug.

**A written design system, followed.** [`PRODUCT.md`](PRODUCT.md) defines the product and brand; [`DESIGN.md`](DESIGN.md) defines the visual system down to named rules and OKLCH token values. Colors are changed at the token layer and never per component. Money is always set in a monospace face with tabular figures so amounts align on the decimal.

**Tests that guard the surface, not just the helpers.** 117 test files, including component tests that assert on rendered markup, plus Playwright end-to-end specs that run against an isolated local Postgres rather than mocks.

## How it works

### Request shape

Every API route follows the same anatomy:

1. `export const dynamic = 'force-dynamic'`.
2. Session check via better-auth (`auth.api.getSession`), 401 if absent. Middleware guards pages only, never `/api`, so each route authenticates itself.
3. Zod parse of the body or query params. Amounts arrive as **strings** and are validated positive.
4. Prisma query where every `where` clause includes `userId`. A record ID alone is never trusted.
5. Errors return `NextResponse.json({ error }, { status })`; Zod failures return 400 with details.

### The mutation pipeline

Creating an expense on a credit card, end to end:

```
Client                          Server                              Deferred
------                          ------                              --------
useMutation.onMutate
  cancel in-flight queries
  snapshot list + balance caches
  patch caches optimistically
  apply account + budget deltas
        |
        v  POST /api/expense-transactions
                                session check -> zod parse
                                build operations[]:
                                  - account.currentBalance -= amount
                                  - expenseTransaction.create
                                await db.$transaction(operations)   <- atomic
                                respond 201
                                                                    after(): recalc
                                                                    statement cycle
        |
        v  onSuccess: merge real id onto the optimistic row
        v  onSettled: invalidateAfterTransactionWrite()
```

Invalidation is centralized in `src/hooks/transactionInvalidations.ts`, split into `EAGER_KEYS` (visible and cheap, refetched immediately) and `DEFERRED_KEYS` (heavy reports, marked stale with `refetchType: 'none'` so they refetch only when next viewed). Hooks never invalidate ad hoc.

### Net worth

Net worth is computed rather than stored. Accounts flagged `addToNetWorth` contribute their `initialBalance`, and the trailing-12-month series is the cumulative sum of monthly income minus monthly expenses layered on that base. Credit cards are excluded from the asset-category breakdown so liabilities do not appear as assets.

### A note on Decimals

Prisma `Decimal` columns serialize to JSON as **strings**, and the caches store them that way on purpose. Client code does `parseFloat` before arithmetic and writes back with `toFixed(2)`. This is intentional, not a bug to be fixed: floats and money do not mix, and `Decimal(15,2)` is the storage type everywhere except one piece of known schema debt (`TransferTransaction.amount` is still `Float`, and correcting it needs a migration run by hand against the production database).

## Main features

### Dashboard
The daily landing screen. Total net worth with monthly change, a net-worth-over-time chart, an asset-category breakdown, this month's income and expenses with net savings, budget status for every category with a limit, recent transactions, and an activity strip.

### Accounts
Create and manage accounts across all 11 types. Each account has an initial balance, a live current balance, and a flag for whether it counts toward net worth (so you can track something without it inflating your net worth). Per-account detail pages show the transactions that moved it.

### Credit cards
Cards are a distinct surface from accounts, because a card is a liability with a cycle rather than a pot of money. Each card carries a statement day, a due day, a current statement balance, and the previous statement balance. Cards can be organized into **card groups**, with their own group pages, for cards that belong to the same issuer or the same purpose.

### Transactions
Three record types share one transactions surface:

- **Expenses**, categorized by expense type and optional subcategory.
- **Income**, categorized by income type.
- **Transfers** between your own accounts, with an optional fee that is automatically recorded as a linked expense on the source account.

All three support tags, notes, inline editing, and pagination. Balance effects are reversed and reapplied correctly on edit, including when the edit moves a transaction to a different account.

### Budgets
Monthly limits per expense category and monthly targets per income category, with spend-to-date, progress, and a totals summary. Budget spend updates optimistically, but only when the transaction's date falls in the current month, because the server aggregation is month-scoped.

### Installments
Register a purchase split across N months. The app creates the plan and its first payment together, then generates one child payment per month automatically. Plans have an explicit status, can be edited, and show remaining payments and monthly amount. The parent is excluded from every aggregate so a ₱24,000 plan never shows up alongside its own ₱2,000 monthly payments.

### Reports
- **Category breakdown** for expenses and income, with distinct chart colors guaranteed for up to 20 categories per render.
- **Annual summary** table.
- **Net worth overview**: monthly bars, period deltas, stats, and progress toward a target you set with a target date.
- **Transaction analyzer**: filter by type, date range, category, subcategory, tag, account, and free-text search, then page through matches.
- **Event ledger** (see below).

## Bonus features

These are the ones that were not on the original plan and turned out to matter most.

**Activity calendar.** A month grid where each day cell shows that day's net movement, with a detail panel for the day's individual transactions. Good for spotting the shape of a month, which a table cannot show you: the clustered weekends, the payday spike, the quiet stretch.

**Tags and the event ledger.** Tags are the only many-to-many relation in the schema, and they span expenses, income, *and* transfers. The **event ledger** is what they exist for: pick one or more tags and it merges expense and income across all three tables into a single date-ordered ledger with totals. Tag everything related to a trip, a renovation, or a medical episode, and get an honest picture of what that event actually cost, net of any money that came back. This is the feature that does not exist in off-the-shelf trackers.

**Transfer fees as real expenses.** A transfer with a fee creates a linked expense record on the source account rather than silently shrinking the transfer amount. Fees show up in your expense reports where they belong, instead of vanishing into the transfer.

**Net worth target.** Set a target amount and a target date; the reports page tracks progress toward it.

**Deferred statement recalculation.** Statement math never blocks a response. It runs after the response is sent, wrapped so a failure logs without ever surfacing as a failed mutation.

**Optimistic everything.** Creates, edits, and deletes all patch the cache before the round trip, including the downstream balance, budget, and net-worth figures, and roll back cleanly on error with a toast.

**Card groups.** Cards grouped by issuer or purpose, with dedicated group views.

## Domain concepts

Worth knowing before reading the code:

| Term | Meaning |
| --- | --- |
| **Financial account** | Anything that holds value or debt: a bank account, a card, a wallet, a property. Carries `initialBalance` (the starting point) and `currentBalance` (denormalized, maintained by mutations). |
| **`addToNetWorth`** | Per-account flag. Lets you track an account without it counting toward net worth. |
| **Statement cycle** | The window between one statement day and the next on a credit card. Balances roll forward: this cycle's opening balance is last cycle's closing balance. |
| **Installment parent** | `isInstallment: true`. Represents the plan, not a payment. Excluded from every aggregate query in the app. |
| **Installment child** | `isSystemGenerated: true` with a `parentInstallmentId`. An actual monthly payment that counts normally. |
| **Event ledger** | A tag-driven merged view of expenses and income, for costing a real-world event rather than a category. |
| **Eager vs deferred invalidation** | After a write, cheap visible queries refetch immediately; expensive report queries are only marked stale and refetch when next viewed. |

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript 5 |
| Database | PostgreSQL on Supabase (`ap-southeast-1`), Prisma 6 |
| Auth | better-auth (email/password, session-based) |
| Server state | TanStack Query v5, with optimistic mutations throughout |
| Forms and validation | React Hook Form + Zod 4, shared schemas client and server |
| Styling | Tailwind CSS v4 with `@theme` OKLCH tokens, shadcn/ui (`new-york`), Radix primitives |
| Charts | Recharts |
| Tables | TanStack Table v8 |
| Motion | Framer Motion, respecting `prefers-reduced-motion` |
| Unit tests | Vitest + happy-dom + Testing Library |
| E2E tests | Playwright against a Dockerized Postgres |
| Hosting | Vercel, functions pinned to `sin1` |
| Scheduling | GitHub Actions cron hitting authenticated API routes |

## Project structure

```
src/
  app/
    (auth)/          sign-in, sign-up
    api/             route handlers (see src/app/api/CLAUDE.md)
      cron/          scheduled jobs, bearer-token authenticated
      reports/       analysis, breakdowns, event ledger, annual summary
    dashboard/  accounts/  cards/  transactions/
    expenses/  income/  transfers/  budgets/  reports/  settings/
  components/
    dashboard/  calendar/  reports/  budgets/  installments/
    tables/  forms/  transactions/  layouts/  shared/  ui/
  hooks/             one query hook per domain (see src/hooks/CLAUDE.md)
  lib/
    statement-calculator.ts     statement balance for a cycle
    statement-recalculator.ts   which cycles to recompute after a write
    net-worth.ts, net-worth-history.ts
    installments.ts, calendar-buckets.ts, chart-colors.ts
    validations/                shared Zod schemas
prisma/
  schema.prisma
  migrations/        21 migrations, applied by hand in production
tests/e2e/           Playwright specs
playwright/          E2E setup and helpers
```

Pattern guides live next to the code they describe: `src/app/api/CLAUDE.md` covers route anatomy, the mutation and balance pattern, installments, and cron; `src/hooks/CLAUDE.md` covers query keys, the optimistic mutation recipe, and invalidation rules.

## Running it locally

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET
docker compose up -d        # Postgres 15 on port 5433
npx prisma migrate dev      # local database only, see the warning below
npm run dev
```

Then open http://localhost:3000 and create an account at `/sign-up`.

> **Database safety.** The `.env` in my working copy points at the live production database holding real financial records. Prisma migration commands are therefore never run automatically anywhere in this project: migrations are written into `prisma/migrations/` and applied by hand, deliberately. If you clone this, point `DATABASE_URL` at the local Docker Postgres before running anything that writes.

Available scripts:

```bash
npm run dev        # dev server
npm run build      # production build, and the project's type check
npm run lint       # ESLint
npx vitest run     # unit and component tests
npm run test:e2e   # Playwright, needs docker compose up first
```

## Demo data

There is a second, entirely separate local database, `money_map_demo`, holding a synthetic
twelve-month financial history. It exists so the app can be shown fully populated without
touching real records, and it is what the screenshots in this README are captured from.

**Safety.** No script in this repository runs `prisma migrate`, `db push`, or `db seed`, in
any form, ever. Schema changes are applied by hand. The commands in step 2 below are yours
to run, once, deliberately, with the connection string typed inline on the command line and
never read from a file.

The demo tooling under `scripts/demo/` is protected by three independent layers, any one of
which alone prevents data loss:

1. **No environment resolution.** The connection string is a hardcoded literal in
   `scripts/demo/connection.ts`, passed via `new PrismaClient({ datasourceUrl })`. Demo
   scripts never read an environment variable and never load an env file, so there is no
   input to get wrong.
2. **A marker table.** `__demo_db_marker` exists only on the demo database and is asserted
   before any write. That is a property of the database actually reached rather than of the
   configuration intended, so it holds even if layer 1 fails completely.
3. **Scoped deletes only.** Every delete carries `where: { userId: "demo-user-money-map" }`.
   There is no unscoped `deleteMany()` anywhere in the demo tooling, and it deliberately
   does not reuse `clearDatabase()` from the Playwright helpers, which deletes unscoped.

### One-time setup

```bash
# 1. Start the local Postgres and create the demo database inside it
docker compose up -d
docker exec money_map_postgres psql -U postgres -c "CREATE DATABASE money_map_demo;"

# 2. Apply migrations to it, with the URL inline. Run this yourself; no script does it.
npx cross-env \
  DATABASE_URL=postgresql://postgres:local_dev_password@localhost:5433/money_map_demo \
  DIRECT_URL=postgresql://postgres:local_dev_password@localhost:5433/money_map_demo \
  npx prisma migrate deploy

# 3. Stamp the marker table, so the seed is willing to write
npm run demo:marker
```

### Everyday use

```bash
npm run seed:demo     # populate (or repopulate) the demo dataset, idempotent
npm run dev:demo      # dev server on the demo database, never on .env
```

`docker-compose.yml` uses a named volume, so the seeded data survives container restarts,
`docker compose down`, and reboots. Only `docker compose down -v` destroys it. Reseeding is
idempotent, so `npm run seed:demo` is always safe to re-run.

### Capturing screenshots

```bash
npm run build          # a production build - no dev-mode indicator badge in the capture
npm run start:demo     # serves it on the demo database, port 3000
npm run screenshots    # in a second terminal: captures desktop + mobile sets
```

`npm run screenshots` drives each surface into the exact state it is supposed to show
(the 1-year net-worth period, a populated calendar day, an individual card's detail
page, the event ledger filtered to a real tag) rather than just navigating to it, and
asserts that state actually took effect before capturing. It writes two full sets -
desktop (1440x900) and a real mobile device profile (390x844, so the app's separate
mobile layout with its bottom nav renders) - to `public/screenshots/desktop/` and
`public/screenshots/mobile/`. Pass `--base-url=http://localhost:PORT` if `start:demo` is
running on a non-default port (for example, because something else already holds 3000).

The Playwright suite targets a different database in the same container (`money_map_dev`)
and wipes it on every run, which is exactly why the demo lives in its own database.

## Testing and CI

**Unit and component tests.** 117 test files under Vitest with happy-dom and Testing Library. Many are component tests that assert on rendered markup, so changing a visible surface means updating its test, on purpose. JSX is transformed by esbuild via `esbuild: { jsx: 'automatic' }` in `vitest.config.mts` rather than `@vitejs/plugin-react`, because that plugin pulls in a second PostCSS version that breaks Tailwind in the dev server.

**End-to-end tests.** Playwright specs cover accounts, budgets, installments, and transactions, running against an isolated local Postgres on port 5433 with migrations applied automatically by the setup step. No mocked network layer, no shared database with development.

**CI.** Every pull request into `main` runs lint, the full unit suite, and a production build on GitHub Actions. `main` is protected and takes changes only through pull requests.

## Scheduled jobs

Two daily jobs run as GitHub Actions workflows that call authenticated API routes, rather than as Vercel Cron. Both authenticate with `Authorization: Bearer $CRON_SECRET`, compared in constant time.

| Job | Schedule | What it does |
| --- | --- | --- |
| `process-installments` | 00:00 UTC daily | Generates the next child payment for every active installment plan that is due, deducting from the card in a single transaction. |
| `process-statements` | 04:00 UTC daily | Rolls credit card statement cycles forward and recalculates statement balances. |

## Design system

The visual language is documented in [`DESIGN.md`](DESIGN.md), with the product and brand definition in [`PRODUCT.md`](PRODUCT.md). The short version:

**Creative north star: "The Private Instrument."** Something well-made you reach for daily. Quiet, exact, trustworthy.

- **Dark only**, on a teal-tinted near-black canvas (`oklch(0.16 0.008 185)`). Depth comes from tonal layering, cards a shade lighter than the base, rather than from shadow.
- **Instrument Teal** carries identity, **Value Brass** marks worth and is deliberately rare, structural slate does the quiet work.
- **The Monospace Money Rule**: every currency figure is set in Geist Mono with tabular figures, so amounts align on the decimal and never reflow between weights.
- **The Rationed Accent Rule**: color intensity is spent only where the data earns it, a budget over its limit or a net-worth swing, never as decoration.
- **The Two-Reds Rule**: ordinary negative money uses a calm loss coral; alarm red is reserved strictly for destructive actions and hard errors.
- Gain and loss are **never carried by hue alone**. Color is always paired with a sign or arrow cue, which is a correctness concern in a finance tool as much as an accessibility one.
- All motion respects `prefers-reduced-motion`.

It explicitly rejects enterprise admin-panel blandness, purple-gradient AI-SaaS sheen, neon-and-glass crypto dashboards, and gamified consumer apps with confetti.

## Status

Actively used, in production, by one person, daily.

It is deployed and reachable, but it has no new-user onboarding, no walkthrough, and no empty-state guidance, because it was never built for a second user. Opening it up properly is possible (the data model is already scoped per user) but is future work, not a current promise.

Not accepting contributions, since the roadmap is whatever I personally need next. Reading the code, borrowing patterns from it, or forking it for your own money is entirely welcome.

## License

[MIT](LICENSE) © Jireh Battung
