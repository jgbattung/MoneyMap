# Style & Conventions

## TypeScript
- Strict TypeScript — no `any` unless absolutely necessary
- Named exports preferred over default exports
- File names: PascalCase for components, camelCase for hooks/utils

## React
- Functional components only
- Custom hooks in `src/hooks/` for all server state (TanStack React Query)
- React Hook Form for all forms
- Zod schemas for all validation at system boundaries

## Components
- Use Shadcn/ui primitives — do not build custom UI when a Shadcn equivalent exists
- Add new Shadcn components via `npx shadcn@latest add <component>`
- Responsive: mobile uses Drawer, desktop uses Sheet (pattern throughout forms)

## API Routes
- Authenticate with `auth.api.getSession()` at the top of every handler
- Return JSON with appropriate HTTP status codes
- Validate all input with Zod schemas from `src/lib/validations/`

## Git & Commits
- Conventional Commits: `<type>(<scope>): <short description>`
- Types: feat, fix, refactor, docs, test, chore
- Never commit directly to `main` — use `feature/`, `fix/`, `docs/`, `refactor/` branches
- One commit per task when executing plans

## Testing
- Unit/component: Vitest 1.x + happy-dom + @testing-library/react
- E2E: Playwright
- Config: `vitest.config.mts` (uses esbuild jsx:automatic — do NOT install @vitejs/plugin-react)
- Run with `npx vitest run` (not `npm run test`) on Windows
