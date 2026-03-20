# Codebase Structure

## Root
- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components
- `src/hooks/` — Custom React Query hooks
- `src/lib/` — Utilities, auth, prisma client, validation schemas
- `src/middleware.ts` — Auth session guard (protects all routes except sign-in/sign-up)
- `prisma/` — Prisma schema and migrations
- `tests/` — Playwright E2E tests
- `docs/` — Spec, plan, and verification docs (Architect/Builder workflow)
- `.claude/` — Claude Code agent config, rules, conventions, hooks

## Pages (src/app/)
- `(auth)/sign-in`, `(auth)/sign-up` — Auth pages (unprotected)
- `dashboard/` — Main dashboard
- `expenses/`, `income/`, `transfers/` — Transaction pages
- `accounts/`, `cards/` — Account and credit card management
- `budgets/` — Budget tracking
- `reports/` — Financial reports
- `transactions/` — Combined transactions view
- `more/` — Settings/more options

## Components (src/components/)
- `ui/` — Shadcn/ui primitives (do not edit directly)
- `forms/` — Create/Edit CRUD forms (React Hook Form + Zod)
- `tables/` — TanStack Table grids (expenses, income, transfers)
- `tables/cells/` — Editable cell components
- `dashboard/` — Dashboard widgets
- `shared/` — Reusable cards, dialogs, skeleton loaders
- `layouts/` — ConditionalLayout with Sidebar (desktop) + BottomBar (mobile)

## Hooks (src/hooks/)
Pattern: `use[Resource]Query` — wraps TanStack React Query for server state
Examples: `useExpenseTransactionsQuery`, `useIncomeTransactionsQuery`, `useEditableTable`

## API Routes (src/app/api/)
Each resource has a `route.ts` with GET/POST, and `[id]/route.ts` with GET/PATCH/DELETE.
All routes call `auth.api.getSession()` for auth and use Zod schemas for validation.

## Validations (src/lib/validations/)
Zod schemas for all resources: account, expense, income, transfer, tags, etc.
