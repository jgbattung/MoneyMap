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
