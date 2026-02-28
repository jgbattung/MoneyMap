# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start Next.js development server (http://localhost:3000)
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm run start` — Start production server
- `npx prisma generate` — Regenerate Prisma client (auto-runs on `npm install`)
- `npx prisma migrate dev` — Run database migrations in development
- `npx prisma studio` — Open Prisma database browser

## Database Safety (CRITICAL — DO NOT OVERRIDE)

There is **no separate test database**. The only database is the live production database used by the deployed app.

**Claude Code MUST NEVER run any of the following commands**, directly or indirectly, without explicit written confirmation from the user in that session:

- `prisma migrate dev`
- `prisma migrate deploy`
- `prisma migrate reset`
- `prisma db push`
- `prisma db seed`
- `prisma migrate resolve`
- Any command that creates, drops, alters, or seeds database tables or data

**Safe Prisma commands** (allowed without confirmation):
- `prisma generate` — only regenerates the TypeScript client, touches no data
- `prisma studio` — read-only browser, but only open if user explicitly asks
- `prisma validate` — validates schema syntax only
- `prisma format` — formats schema file only

**If a spec or plan includes a migration step**, stop and tell the user:
> "This task requires a database migration (`[command]`). Since this will affect the live production database, please run it manually and confirm before I proceed."

Never run migrations as part of automated plan execution, post-execution checklists, or QA pipelines.

## Architecture

See `.agents/conventions/tech-stack.md` for the full shared tech stack and architecture reference. Quick summary:

- **Routing:** Next.js App Router, file-based in `src/app/`, auth pages under `(auth)`
- **Data flow:** Components → Custom hooks (`src/hooks/`) → TanStack React Query → `/api/*` routes → Prisma → PostgreSQL
- **Auth:** Better Auth, session checked in middleware (`src/middleware.ts`)
- **Validation:** Zod schemas in `src/lib/validations/`
- **Components:** Shadcn/ui (new-york style) in `src/components/ui/`

## Agent Rules

See `.claude/rules/` for behavioral rules:
- `.claude/rules/persona.md` — Identity and coding standards
- `.claude/rules/gemini-collab.md` — How to work with Gemini
- `.claude/rules/post-execution.md` — Post-build checklist

## Shared Conventions

See `.agents/conventions/` for shared standards:
- `.agents/conventions/handoff-protocol.md` — Spec format and handoff rules
- `.agents/conventions/tech-stack.md` — Full tech stack reference
- `.agents/conventions/commit-conventions.md` — Git commit and PR standards

## Workflows

See `.agents/workflows/` for cross-agent workflows.
