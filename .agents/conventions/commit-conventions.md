# Commit Conventions

> Shared git and PR standards for both Gemini and Claude Code.

## 🚨 #1 CRITICAL DIRECTIVE: Never Commit Directly to `main`

**This rule applies to ALL agents — Claude Code AND Gemini/Antigravity — without exception.**

**Always create a branch before making any commit.** No exceptions, even for small changes, chore commits, or config-only changes.

**Before running any `git commit` command, ALWAYS run `git branch --show-current` first.** If it returns `main`, stop and create a feature branch before proceeding.

## Full Commit Flow

When asked to commit **any** change:

1. **Check current branch** — run `git branch --show-current`. If on `main`, create and switch to a new branch first: `git checkout -b <type>/<description>`
2. **Stage ALL relevant files** — use `git status` to find both staged and untracked files. Use `git add` for everything that belongs to this change. Do not leave related files unstaged.
3. **Commit** using the Conventional Commits format below
4. **Push** to the new branch (never to `main`)
5. **Open a PR** on GitHub with a title matching the Conventional Commits format

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
