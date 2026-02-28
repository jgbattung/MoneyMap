# Money Map Testing Infrastructure

## What This Is

This project phase establishes the core automated testing infrastructure for Money Map. It involves setting up unit/component tests using Vitest + React Testing Library and End-to-End (E2E) tests using Playwright to ensure the application remains stable and reliable as it grows.

## Core Value

Enable confident refactoring and new feature development by automatically verifying that critical application workflows (like authentication and data processing) function exactly as expected.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Install and configure Vitest with React Testing Library for component/unit tests.
- [ ] Install `vitest-mock-extended` or equivalent to enable DB/Prisma mocking.
- [ ] Install and configure Playwright for E2E browser tests.
- [ ] Hook up the `.claude/skills/generate-tests` and `run-and-heal-tests` scripts for Claude Code.
- [ ] Write foundational unit tests for critical utility functions and custom hooks (e.g., data formatting).
- [ ] Write initial E2E tests covering the core user flows (Sign Up, Sign In, Basic Dashboard Load).
- [ ] Configure a GitHub Actions CI/CD workflow to run all tests automatically on pull requests to the `main` branch.

### Out of Scope

- Comprehensive test coverage (>80%) across all existing components — this phase focuses on *infrastructure setup* and testing the most critical paths first.
- Visual regression testing — beyond the scope of this initial stability pass.

## Context

Money Map is a Next.js 15 App Router application utilizing Prisma, PostgreSQL, Better Auth, and Shadcn UI. As a financial application, accuracy and reliability in data handling and user authentication are paramount. The codebase currently lacks an automated testing suite, making making changes risky. The goal is to introduce standard, modern testing tools (Vitest, Playwright) that integrate seamlessly with the existing GitHub Actions CI pipeline.

## Constraints

- **Tech Stack**: Next.js 15 App Router — Requires specific configurations for Vitest (e.g., `next/jest` or equivalent Next.js native testing setup) and Playwright.
- **Database**: Prisma + PostgreSQL — E2E tests will need a reliable way to seed or mock database state for consistent test environments without polluting production data.
- **Authentication**: Better Auth — Tests need to be able to bypass or programmatically complete the auth flow.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Vitest + RTL | Recommended Next.js 15 test stack; aligns directly with the `.claude/skills/` testing tools already built for Claude. | ✓ Good |
| Use Playwright | Superior E2E browser support, async handling, and fits natively into the existing Claude testing skills context. | ✓ Good |
| Prisma Mocking | Using `vitest-mock-extended` enables mocked DB access in Component/API tests without bleeding state. | ✓ Good |
| Prioritize Auth & Core Hooks | These areas pose the highest risk if broken; testing them first provides the most immediate value. | — Pending |

---
*Last updated: 2026-02-28 after new-project initialization*
