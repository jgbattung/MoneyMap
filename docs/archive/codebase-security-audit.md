# Money Map — Comprehensive Security Audit Report

**Audit Date:** 2026-03-07
**Auditor:** Security Auditor Agent
**Scope:** Full application security audit of the Money Map codebase
**Codebase Path:** `c:\Users\LENOVO\OneDrive\Desktop\personal-projects\money-map`

---

## Executive Summary

Money Map is a personal finance management application built with Next.js 15 (App Router), Prisma ORM (PostgreSQL), Better Auth for authentication, and TanStack React Query for client-side state management. The audit examined 30+ API route files, middleware, authentication configuration, validation schemas, the data model, dependency manifest, and client-side patterns.

**Overall Risk Rating: MEDIUM**

The application demonstrates several good security practices including consistent session validation across all API routes, parameterized queries via Prisma ORM, userId-scoped database queries preventing IDOR, and proper `.gitignore` coverage for environment files. However, multiple medium-to-high severity gaps were identified that should be addressed before production hardening.

### Finding Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| Critical | 0 | -- |
| High | 3 | No server-side Zod validation, no rate limiting, no security headers |
| Medium | 5 | Excessive production logging, build error suppression, CSRF gap, enum bypass, dangerouslySetInnerHTML |
| Low | 4 | Auth debug logs, no pagination caps, OAuth token storage, missing explicit auth secret |
| Observation | 3 | Non-timing-safe cron comparison, unused server-side schemas, transfer logic bug |

---

## Detailed Findings

### HIGH-1: No Server-Side Zod Validation on API Route Handlers

**Severity:** HIGH
**Category:** Input Validation (OWASP A03)
**Affected Files:** All `src/app/api/**/route.ts` POST/PATCH handlers (30+ routes)

**Description:**
The codebase defines Zod validation schemas in `src/lib/validations/` (for accounts, expense-transactions, income-transactions, transfer-transactions, expense types, income types, transfer types). However, none of these schemas are imported or used in any API route handler. All API routes perform only rudimentary `if (!field)` truthiness checks and then pass user-supplied values directly to `parseFloat()`, `parseInt()`, and Prisma queries.

**Evidence:**
- `src/app/api/accounts/route.ts` lines 59-68: `const body = await request.json()` followed by manual truthy checks only, no Zod parsing.
- `src/app/api/expense-transactions/route.ts` lines 161-176: Destructures body without schema validation.
- `src/app/api/income-transactions/route.ts` lines 151-155: Same pattern.
- `src/app/api/transfer-transactions/route.ts` lines 164-168: Same pattern.
- `src/lib/validations/expense-transactions.ts` line 3: Defines `ExpenseTransactionValidation` — never imported by any API route.
- `src/lib/validations/account.ts` line 3: Defines `AccountValidation` with proper enum validation — never imported by any API route.

**Impact:**
- Malformed inputs bypass client-side validation and reach the database layer.
- `parseFloat("abc")` produces `NaN`, which when stored as a `Decimal(15,2)` column could corrupt financial balance data.
- The `accountType` field in POST `/api/accounts` accepts any string, not just valid enum values, resulting in unhandled Prisma errors (500 instead of 400).
- No length limits enforced server-side for `name`, `description`, or other text fields.
- No type coercion validation — a string passed where a number is expected may cause subtle errors.

**Recommendation:**
Import and apply Zod schemas with `.safeParse()` in every mutating API route handler. Return structured 400 errors on validation failure. This is the single highest-impact change. The schemas already exist in `src/lib/validations/` and can be reused with minor adaptation.

---

### HIGH-2: No Rate Limiting on Any Endpoint

**Severity:** HIGH
**Category:** Availability / Brute Force Prevention (OWASP A07)
**Affected Files:** All API routes, `src/middleware.ts`

**Description:**
There is no rate limiting implementation anywhere in the codebase. No middleware-level throttling, no per-route limiters, no external rate-limiting service integration.

**Evidence:**
- Grep for `rate.?limit|rateLimit|throttle` across `src/` returned zero results.
- `src/middleware.ts` only checks session existence and redirects.
- `package.json` contains no rate-limiting dependencies.

**Impact:**
- Authentication endpoints (`/api/auth/[...all]`) are vulnerable to brute-force password attacks. Better Auth has `minPasswordLength: 8` but no attempt throttling configured.
- Financial mutation endpoints (POST/PATCH/DELETE) can be hit repeatedly with automated requests.
- The middleware's session check call to `/api/auth/get-session` runs on every page navigation, creating a self-amplifying load vector.

**Recommendation:**
Implement rate limiting at the middleware level or per-route. For Vercel deployment, consider `@upstash/ratelimit` with Redis. Priority targets: auth endpoints (strict: 5 attempts/minute), mutation endpoints (moderate: 30 requests/minute), read endpoints (relaxed: 100 requests/minute).

---

### HIGH-3: No Security Headers Configured

**Severity:** HIGH
**Category:** Security Misconfiguration (OWASP A05)
**Affected Files:** `next.config.ts`, `src/middleware.ts`

**Description:**
No security-related HTTP headers are configured anywhere in the application.

**Evidence:**
- `next.config.ts` lines 1-12: Only `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` flags are set. No `headers()` function.
- Grep for `Content-Security-Policy|X-Frame-Options|X-Content-Type|Strict-Transport` returned zero results across all source files.

**Missing Headers:**
- `Strict-Transport-Security` (HSTS) — prevents protocol downgrade attacks
- `Content-Security-Policy` (CSP) — prevents XSS and data injection
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `Permissions-Policy` — restricts browser features

**Impact:**
- Clickjacking attacks possible (embedding the app in an iframe).
- MIME-type sniffing attacks on any user-uploaded or served content.
- No HSTS enforcement for HTTPS-only connections.
- Broader XSS exploitation surface without CSP.

**Recommendation:**
Add a `headers()` async function to `next.config.ts` that sets all standard security headers for all routes.

---

### MEDIUM-1: Excessive Console Logging in Production API Routes

**Severity:** MEDIUM
**Category:** Information Disclosure (OWASP A09)
**Affected Files:** 33 API route files (79 total `console.log/error/warn` occurrences)

**Description:**
API routes contain extensive `console.log()` statements that log operational data including session state, request URLs, financial amounts, installment IDs, and processing details.

**Evidence:**
- `src/middleware.ts` lines 17-18: Logs pathname and session existence for every navigation request.
- `src/app/api/auth/[...all]/route.ts` lines 7-8, 17-18: Logs full request URL and pathname for every auth request.
- `src/app/api/cron/process-installments/route.ts` line 114: `console.log(...deducted ${installment.monthlyAmount})` — logs financial amounts.
- `src/app/api/expense-transactions/route.ts` lines 178-179: Logs received date values with emoji prefixes.
- `src/app/api/cron/process-statements/route.ts` line 103: Logs statement balance values.

**Impact:**
- Financial data (transaction amounts, account balances, statement balances) persisted in log storage.
- Auth debug logs could reveal session patterns and user behavior.
- Violates data minimization principles.

**Recommendation:**
Remove all `console.log()` debug statements. Replace `console.error()` with a structured logger that redacts sensitive fields (amounts, balances, user IDs).

---

### MEDIUM-2: TypeScript and ESLint Errors Suppressed in Build

**Severity:** MEDIUM
**Category:** Defense in Depth
**Affected Files:** `next.config.ts`

**Description:**
Both `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true` are configured, allowing the production build to succeed despite type errors and lint violations.

**Evidence:**
- `next.config.ts` lines 4-8.
- `src/app/api/expense-transactions/[id]/route.ts` line 133: `// eslint-disable-next-line @typescript-eslint/no-explicit-any` followed by `const updateData: any = {}` — demonstrates `any` usage that benefits from enforcement.

**Impact:**
- Type errors causing runtime crashes or `undefined` behavior will not block deployment.
- Security-relevant ESLint rules are silently bypassed.
- For a financial application handling real money, type safety is a critical correctness guarantee.

**Recommendation:**
Remove both suppression flags. Fix underlying type/lint errors. At minimum, remove `typescript.ignoreBuildErrors`.

---

### MEDIUM-3: CSRF Protection Gap on Custom API Routes

**Severity:** MEDIUM
**Category:** Session Security (OWASP A01)
**Affected Files:** All mutating API routes (POST/PATCH/DELETE)

**Description:**
Better Auth provides CSRF protection for its own `/api/auth/*` endpoints. However, the application's custom API routes rely solely on session cookies for authentication without any additional CSRF defense.

**Evidence:**
- Grep for `csrf|CSRF` across `src/` returned zero results.
- `src/middleware.ts` lines 34-36: API routes are excluded from middleware via the matcher pattern `/((?!api|_next/static|...)`.
- All mutating routes authenticate via `auth.api.getSession()` which reads the session cookie.

**Impact:**
- If a user is authenticated and visits a malicious site, that site could forge cross-origin POST/PATCH/DELETE requests using the victim's session cookie.
- The `SameSite` cookie attribute (set by Better Auth) provides partial mitigation but may not cover all scenarios (e.g., `SameSite=Lax` allows top-level GET navigations).

**Recommendation:**
Verify Better Auth's `SameSite` cookie configuration (should be `Lax` or `Strict`). For defense-in-depth, consider validating the `Origin` or `Referer` header in a shared API middleware wrapper for all mutating endpoints.

---

### MEDIUM-4: `accountType` Enum Not Validated Server-Side

**Severity:** MEDIUM
**Category:** Input Validation
**Affected Files:** `src/app/api/accounts/route.ts`, `src/app/api/accounts/[id]/route.ts`

**Description:**
The `accountType` field from the request body is passed directly to Prisma without validating it against the `AccountType` enum. Prisma will throw a database-level error for invalid values, producing a 500 response with potentially schema-revealing error details.

**Evidence:**
- `src/app/api/accounts/route.ts` line 61: `accountType` destructured from body, used on line 74 without validation.
- `src/lib/validations/account.ts` lines 8-20: Defines proper `z.enum()` validation but it is not imported in the route.

**Recommendation:**
Subsumed by HIGH-1. Apply the existing `AccountValidation` schema server-side.

---

### MEDIUM-5: `dangerouslySetInnerHTML` in Chart Component

**Severity:** MEDIUM
**Category:** XSS Surface (OWASP A03)
**Affected Files:** `src/components/ui/chart.tsx` line 83

**Description:**
The chart component uses `dangerouslySetInnerHTML` to inject CSS theme styles. The content is derived from a static `THEMES` constant (not user input), so there is no current exploitation path. However, this pattern creates a maintenance risk.

**Evidence:**
- `src/components/ui/chart.tsx` line 83: `dangerouslySetInnerHTML={{ __html: Object.entries(THEMES)... }}`

**Impact:**
- No current risk (static data source).
- If `THEMES` were ever derived from user input or API data, this would become an XSS vector.

**Recommendation:**
Document that the THEMES object must remain static. Consider generating CSS at build time or using CSS custom properties set via `style` attributes instead.

---

### LOW-1: Debug Logging in Auth Route Handler

**Severity:** LOW
**Category:** Information Disclosure
**Affected Files:** `src/app/api/auth/[...all]/route.ts`

**Description:**
The auth catch-all route logs full request URLs, pathnames, and response status codes for every auth operation.

**Evidence:**
- Lines 7-8: `console.log("GET called with URL:", request.url)` and pathname logging.
- Lines 17-18: Same for POST.

**Recommendation:**
Remove all debug logging from the auth route handler.

---

### LOW-2: No Pagination Upper-Bound Limits

**Severity:** LOW
**Category:** Denial of Service
**Affected Files:** `src/app/api/expense-transactions/route.ts`, `src/app/api/income-transactions/route.ts`, `src/app/api/transfer-transactions/route.ts`

**Description:**
The `take` query parameter is parsed via `parseInt()` without any upper bound. A client could request `?take=999999`.

**Evidence:**
- `src/app/api/expense-transactions/route.ts` line 32: `const takeNumber = take ? parseInt(take) : undefined;`

**Recommendation:**
Enforce `Math.min(takeNumber, 100)` or similar cap.

---

### LOW-3: OAuth Tokens Stored Without Application-Layer Encryption

**Severity:** LOW
**Category:** Data Security
**Affected Files:** `prisma/schema.prisma` (Account model, lines 54-56)

**Description:**
The `Account` model stores `accessToken`, `refreshToken`, and `idToken` as plain `String?` columns. Better Auth handles password hashing internally, but OAuth tokens are stored as-is.

**Recommendation:**
For production, consider encrypting OAuth tokens at the application layer before storage.

---

### LOW-4: `BETTER_AUTH_SECRET` Not Explicitly Configured

**Severity:** LOW
**Category:** Configuration Security
**Affected Files:** `src/lib/auth.ts`

**Description:**
Better Auth requires `BETTER_AUTH_SECRET` for signing sessions. It is read from `process.env` automatically but never explicitly referenced or validated in the application configuration.

**Recommendation:**
Explicitly pass `secret: process.env.BETTER_AUTH_SECRET` and add a startup check that it is defined.

---

### OBS-1: Cron Secret Comparison Uses Non-Timing-Safe Comparison

**Severity:** Observation
**Affected Files:** `src/app/api/cron/process-installments/route.ts` line 10, `src/app/api/cron/process-statements/route.ts` line 10

**Description:**
`token !== process.env.CRON_SECRET` is not timing-safe. Practical risk is negligible for infrastructure-called cron endpoints.

**Recommendation:**
Use `crypto.timingSafeEqual()` for defense-in-depth.

---

### OBS-2: Zod Schemas Exist But Are Only Used Client-Side

**Severity:** Observation
**Affected Files:** `src/lib/validations/*.ts`

**Description:**
Well-structured Zod schemas exist and are ready for server-side reuse. This supports the HIGH-1 remediation.

---

### OBS-3: Transfer Transaction PATCH Has Logic Inversion

**Severity:** Observation
**Affected Files:** `src/app/api/transfer-transactions/[id]/route.ts` line 212

**Description:**
`const accountsChanged = existingTransfer.fromAccountId === fromAccountId || existingTransfer.toAccountId === toAccountId;` uses `===` (equals) instead of `!==` (not-equals). This means the "accounts changed" branch triggers when accounts are the SAME. The final balance result is correct (reverse-then-reapply produces the same outcome as a differential update), but it does unnecessary work and inverts the intended semantics.

---

## Positive Findings

1. **Consistent Authentication:** Every API route checks `auth.api.getSession()` and returns 401 if absent. Zero unauthenticated custom routes.
2. **User Scoping (IDOR Prevention):** All database queries include `userId: session.user.id` in `where` clauses, preventing horizontal privilege escalation.
3. **SQL Injection Prevention:** Prisma ORM parameterizes all queries. The single `$queryRaw` usage in `annual-summary/route.ts` correctly uses tagged template literals with Prisma's automatic parameterization.
4. **No XSS Vectors:** React JSX escaping used throughout. No `eval()`, `Function()`, or `innerHTML` found. The single `dangerouslySetInnerHTML` uses only static data.
5. **Environment Files Properly Gitignored:** `.env*` in `.gitignore`. No `.env` files committed to the repository.
6. **Cron Endpoints Protected:** Both cron routes validate a `CRON_SECRET` Bearer token before processing.
7. **Database Transactions:** All financial mutations use `db.$transaction()` for atomicity.
8. **Cascade Deletes:** Schema uses `onDelete: Cascade` appropriately for user-owned data.

---

## Handoff Note for Builder

**Audit Focus:** Full application security audit covering authentication, API route security, input validation, data exposure, injection prevention, middleware, secrets management, dependencies, and client-side security.

**Branch name suggestion:** `fix/security-api-validation-and-headers`

**Files most likely to be affected:**
- `src/app/api/accounts/route.ts`
- `src/app/api/accounts/[id]/route.ts`
- `src/app/api/expense-transactions/route.ts`
- `src/app/api/expense-transactions/[id]/route.ts`
- `src/app/api/income-transactions/route.ts`
- `src/app/api/income-transactions/[id]/route.ts`
- `src/app/api/transfer-transactions/route.ts`
- `src/app/api/transfer-transactions/[id]/route.ts`
- `src/app/api/expense-types/route.ts`
- `src/app/api/expense-types/[id]/route.ts`
- `src/app/api/income-types/route.ts`
- `src/app/api/income-types/[id]/route.ts`
- `src/app/api/transfer-types/route.ts`
- `src/app/api/transfer-types/[id]/route.ts`
- `src/app/api/cards/route.ts`
- `src/app/api/cards/[id]/route.ts`
- `src/app/api/user/net-worth-target/route.ts`
- `next.config.ts`
- `src/middleware.ts`
- `src/app/api/auth/[...all]/route.ts`
- `src/app/api/cron/process-installments/route.ts`
- `src/app/api/cron/process-statements/route.ts`
- `src/lib/auth.ts`

**Watch out for:**
- Do NOT change how Better Auth handles password hashing internally.
- Reuse existing Zod schemas from `src/lib/validations/` but note they use `z.string()` for amounts (matching the client-side form values). Server-side, amounts arrive as strings in the JSON body too, so the schemas should be compatible. Validate first, THEN `parseFloat()`.
- Do NOT modify `prisma/schema.prisma` or run any migrations.
- The transfer transaction PATCH route (`src/app/api/transfer-transactions/[id]/route.ts`) has complex balance logic — the `accountsChanged` condition on line 212 has an inverted comparison (`===` instead of `!==`). If you fix it, test both the "same accounts, different amount" and "different accounts" scenarios carefully.
- The `parseFloat()` / `parseInt()` calls should remain but only be applied AFTER Zod validation confirms the value is a valid numeric string.
- When adding security headers in `next.config.ts`, use the `async headers()` config function. Make sure CSP allows the domains needed by Better Auth (Google OAuth), recharts, and any CDN assets.

**Verification focus:**
- After adding Zod validation, send malformed requests (NaN amounts, invalid enum values, missing required fields, 10000-character strings) and verify 400 responses with structured error messages instead of 500s.
- After adding security headers, use `curl -I https://your-domain.com` or browser DevTools Network tab to verify all security headers are present.
- After removing `console.log` statements, verify error logging still captures actual errors (500 paths).
- Run the full test suite (`npx vitest run`) and confirm existing tests pass.
- Test all CRUD operations manually: create/read/update/delete for accounts, cards, transactions, types.
