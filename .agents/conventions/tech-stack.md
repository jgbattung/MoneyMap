# Tech Stack & Architecture

> Shared source of truth for both Gemini and Claude Code.
> Both agents must align on these technologies and patterns.

## Core Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15 |
| UI Library | React | 19 |
| Language | TypeScript | 5.x |
| ORM | Prisma | 6 |
| Database | PostgreSQL | — |
| Auth | Better Auth | — |
| UI Components | Shadcn/ui (new-york style) | — |
| State/Fetching | TanStack React Query | — |
| Forms | React Hook Form + Zod | — |
| Tables | TanStack Table | — |
| Styling | Tailwind CSS | 4 |

## Routing & Pages

Next.js App Router with file-based routing in `src/app/`. Auth pages are grouped under `(auth)`. All pages except `/sign-in` and `/sign-up` are protected by middleware (`src/middleware.ts`) which checks the Better Auth session.

## Data Flow

```
Components → Custom hooks (src/hooks/) → TanStack React Query → /api/* routes → Prisma → PostgreSQL
```

- Custom hooks follow the pattern `use[Resource]Query` (e.g., `useExpenseTransactionsQuery`, `useBudgetStatus`)
- API routes authenticate via `auth.api.getSession()` and return JSON with appropriate HTTP status codes
- Validation uses Zod schemas from `src/lib/validations/`

## Components Organization

| Directory | Purpose |
|-----------|---------|
| `src/components/ui/` | Shadcn/ui primitives (don't edit directly; use `npx shadcn@latest add`) |
| `src/components/forms/` | CRUD form components using React Hook Form + Zod |
| `src/components/tables/` | TanStack Table data grids |
| `src/components/dashboard/` | Dashboard widgets (net worth, charts, summaries) |
| `src/components/shared/` | Reusable cards, dialogs, skeleton loaders |
| `src/components/layouts/` | Sidebar (desktop) + BottomBar (mobile) via ConditionalLayout |

## Cron Jobs

GitHub Actions workflows (`.github/workflows/`) run daily to process installments and credit card statements via API endpoints under `/api/cron/`.
