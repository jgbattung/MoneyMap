# Suggested Commands

## Development
- `npm run dev` — Start Next.js dev server at http://localhost:3000
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint

## Testing
- `npx vitest run` — Run unit/component tests (use npx, not npm run test, on Windows)
- `npx vitest` — Run tests in watch mode
- `npx playwright test` — Run E2E tests
- `npx playwright test --ui` — Run E2E tests with UI

## Database (CAUTION — live production DB only)
- `npx prisma generate` — Regenerate Prisma client (safe)
- `npx prisma validate` — Validate schema (safe)
- `npx prisma format` — Format schema (safe)
- `npx prisma studio` — Open DB browser (safe, read-only)
- ⚠️ NEVER run `prisma migrate dev/deploy/reset` or `prisma db push/seed` without explicit user confirmation

## Git (Windows)
- `git status`, `git log`, `git diff` — standard git commands
- `git add <file>` — stage specific files
- `git commit -m "message"` — commit
- Never commit directly to `main` — always create a branch first
