# Commit Conventions

> Shared git and PR standards for both Gemini and Claude Code.

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short description>
```

### Types

| Type | When to use |
|------|------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code restructuring with no behavior change |
| `style` | Formatting, whitespace, missing semicolons (no logic change) |
| `docs` | Documentation only (specs, README, CLAUDE.md) |
| `chore` | Build config, dependencies, tooling |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |

### Scope

Use the primary area affected (e.g., `dashboard`, `auth`, `api`, `prisma`, `budget`).

### Examples

```
feat(dashboard): add net worth chart widget
fix(api): handle null balance in account sync
refactor(hooks): extract shared query options
docs(specs): add dashboard redesign spec
chore(deps): upgrade prisma to v6.3
```

## Branch Naming

```
feature/<short-description>
fix/<short-description>
refactor/<short-description>
docs/<short-description>
```

Examples: `feature/dashboard-redesign`, `fix/balance-calculation`, `docs/api-spec`.

## Pull Requests

- PR title follows the same `<type>(<scope>): <description>` format.
- PR body should reference the spec it implements (e.g., "Implements `/docs/dashboard-spec.md`").
- Link related issues if applicable.
