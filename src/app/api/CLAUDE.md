# API Routes

Loaded when working in `src/app/api/`. Root CLAUDE.md rules (production DB, no migrations) still apply.

## Route anatomy

Every route: `export const dynamic = 'force-dynamic'`, then:

1. `auth.api.getSession({ headers: await headers() })` -> 401 if null.
2. Parse with the route's zod schema (server schemas live in the route file; amounts arrive as **strings** validated positive).
3. Prisma via `db` from `@/lib/prisma`. Every `where` includes `userId: session.user.id` - never trust a record id alone.

Errors: try/catch around the handler, `NextResponse.json({ error }, { status })`, zod failures -> 400 with details.

## Mutation pattern (the atomicity invariant)

Account balances are denormalized on `FinancialAccount.currentBalance`. Mutations build an `operations: PrismaPromise[]` array - balance update(s) + transaction record write(s) - and execute with a single `await db.$transaction(operations)`. Never split these into separate awaits.

Balance semantics (client optimistic code mirrors these exactly - if you change them, update `src/hooks/optimisticBalances.ts`):

- expense create = `-amount`; income create = `+amount`
- transfer create = `-amount` on fromAccount, `+amount` on toAccount, `-fee` on fromAccount
- edits reverse the old effect then apply the new one (account changed: refund old account, charge new account)
- deletes reverse the original effect

## Deferred work via after()

Credit-card statement recalculation must never block the response. After the `$transaction`, call `after(async () => { ... })` from `next/server` with the matching hook from `src/lib/statement-recalculator.ts` (`onExpenseTransactionChange` / `onIncomeTransactionChange` / `onTransferTransactionChange`), wrapped in try/catch that only logs. Pass the `accountType` hint when the transaction results already carry it (skips a DB lookup), and pass `oldDate` on edits that changed the date so both cycles recalculate.

## Installments

- The parent row has `isInstallment: true` and **never counts in any aggregate** - every report/summary query filters `isInstallment: false`. Keep new aggregates consistent or numbers double-count.
- Creating an installment also creates the "Payment 1/N" child (`isInstallment: false`, `isSystemGenerated: true`, `parentInstallmentId`) in the same `$transaction` - but only when `installmentStartDate <= today`. Subsequent payments come from the daily cron.
- `/api/cron/*` routes authenticate with `Authorization: Bearer CRON_SECRET` and are hit by GitHub Actions workflows daily (installments 00:00 UTC, statements 04:00 UTC).

## Queries

- Pagination: `skip`/`take` with `take` capped (100 on transaction lists, 50 on report endpoints). Fetch `take + 1` to compute `hasMore`. The event-ledger route merges expense + income by fetching `skip + take + 1` from each table, merging date-desc, slicing.
- The DB is in ap-southeast-1 next to the `sin1` functions, but still run independent reads with `Promise.all` - serial awaits were this app's main historical perf bug.
- `Tag` is the only M2M and spans expense/income/transfer. Prisma `updateMany` cannot `connect` relations - batch tag writes are individual `update` calls composed in `db.$transaction([...])`.
- Prisma Decimals serialize to JSON as strings; don't "fix" that, the whole client depends on it.
