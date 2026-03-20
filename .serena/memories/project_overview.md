# Money Map — Project Overview

Money Map is a personal finance tracking web app. It tracks income, expenses, transfers, credit cards, accounts, budgets, net worth, and reports.

## Tech Stack
- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5
- **Database:** PostgreSQL via Prisma 6 ORM
- **Auth:** Better Auth (session checked in `src/middleware.ts`)
- **UI:** Shadcn/ui (new-york style), Tailwind CSS 4, Radix UI primitives
- **State/Fetching:** TanStack React Query 5
- **Forms:** React Hook Form + Zod 4
- **Tables:** TanStack Table 8
- **Charts:** Recharts
- **Animations:** Framer Motion

## Data Flow
Components → Custom hooks (`src/hooks/`) → TanStack React Query → `/api/*` routes → Prisma → PostgreSQL

## Cron Jobs
GitHub Actions workflows run daily to process installments and credit card statements via `/api/cron/` endpoints.
