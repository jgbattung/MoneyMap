# Transaction Update Tests Spec

## Purpose

Regression tests for the transaction update bug fix on the `fix/transaction-update-validation` branch. The bug caused 400 errors when updating income and transfer transactions because nullable DB fields (`description`, `notes`) sent `null` to the server, and `z.string().optional()` rejects `null`. The fix also addressed the income account-change balance logic and the transfer `accountsChanged` edge case.

These tests ensure:
1. Updates don't fail when nullable fields are untouched (the primary regression)
2. Updates correctly adjust account balances — including when the account changes
3. The transfer `accountsChanged` edge case (both accounts changed) works correctly

---

## Layer 1: API Route Unit Tests (Vitest)

### File: `src/app/api/income-transactions/[id]/route.test.ts`

Follow the exact mock patterns from `src/app/api/expense-transactions/route.test.ts`:
- Mock `next/headers`, `@/lib/auth`, `@/lib/prisma`, `@/lib/statement-recalculator`
- Use `NextRequest` with `PATCH` method
- The `db.$transaction` mock should receive a callback and invoke it with a mock `tx`

#### Test cases

**Schema validation — the primary regression**

1. `PATCH with only date changed (description null in DB)` — send `{ date: "2026-03-15" }` without `description` field. Should return 200, not 400.
2. `PATCH with only name changed` — send `{ name: "New Name" }` without other fields. Should return 200.
3. `PATCH with description explicitly null` — send `{ description: null }`. Should return 200 (schema now accepts null).
4. `PATCH with all fields provided` — full update payload. Should return 200.
5. `PATCH with empty body` — send `{}`. Should return 400 (no updateable fields).

**Balance logic — amount change on same account**

6. `PATCH amount up on same account` — existing amount 1000, new amount 1500. The account balance should be incremented by 500.
7. `PATCH amount down on same account` — existing amount 1000, new amount 700. The account balance should be decremented by 300.

**Balance logic — account change (the income account-change bug)**

8. `PATCH accountId change, same amount` — existing account A (balance 5000), new account B (balance 3000), amount stays 1000. After update: account A balance = 4000, account B balance = 4000.
9. `PATCH accountId change AND amount change` — existing account A (balance 5000), amount was 1000, new account B (balance 3000), new amount 1500. After update: account A balance = 4000 (removes old income), account B balance = 4500 (adds new income).

**Auth / error paths**

10. `PATCH unauthenticated` — no session. Should return 401.
11. `PATCH transaction not found` — `findUnique` returns null. Should return 404.

---

### File: `src/app/api/transfer-transactions/[id]/route.test.ts`

Follow the same mock patterns. The transfer mock needs additional models: `transferTransaction`, `expenseTransaction` (for fee), and both `fromAccount`/`toAccount` via `financialAccount`.

#### Test cases

**Schema validation — the primary regression**

1. `PATCH with only date changed (notes null in DB)` — send `{ date: "2026-03-15" }` without `notes`. Should return 200.
2. `PATCH with notes explicitly null` — send `{ notes: null }`. Should return 200.
3. `PATCH with amount as number` — send `{ amount: 12345 }` (number, not string). Should return 200 (`z.coerce.string()` handles this — this is the coercion regression).
4. `PATCH with only name changed` — send `{ name: "Updated Transfer" }`. Should return 200.
5. `PATCH with all fields provided` — full update payload. Should return 200.

**Balance logic — amount change, same accounts**

6. `PATCH amount up` — existing amount 5000, new amount 6000. fromAccount balance decremented by 1000, toAccount balance incremented by 1000.
7. `PATCH amount down` — existing amount 5000, new amount 4000. fromAccount balance incremented by 1000, toAccount balance decremented by 1000.

**Balance logic — account changes (the both-accounts edge case)**

8. `PATCH only fromAccountId changes` — same amount, different fromAccount. Old fromAccount restored (+amount), new fromAccount debited (-amount), toAccount unchanged.
9. `PATCH only toAccountId changes` — same amount, different toAccount. fromAccount unchanged, old toAccount restored (-amount), new toAccount credited (+amount).
10. `PATCH both accounts change` — the edge case fixed by `!==`. Old fromAccount restored, old toAccount restored, new fromAccount debited, new toAccount credited. All four balance adjustments must occur.

**Fee logic**

11. `PATCH adds a fee where none existed` — send `feeAmount: "200"`. A new fee expense transaction should be created and fromAccount debited by fee.
12. `PATCH removes an existing fee` — send `feeAmount: ""`. The existing fee expense transaction should be deleted and fromAccount credited.
13. `PATCH changes fee amount` — send updated `feeAmount`. Fee expense updated, balance difference applied.

**Auth / error paths**

14. `PATCH unauthenticated` — Should return 401.
15. `PATCH transaction not found` — Should return 404.
16. `PATCH fromAccountId === toAccountId` — Should return 400 with validation error.

---

## Layer 2: E2E Tests (Playwright)

### File: `tests/e2e/transactions.spec.ts`

Add a new `describe` block: `"Transaction updates"`. Use the same `beforeAll` pattern as the existing describe block — seed DB, create test session, create required accounts and transaction records directly via `prisma`.

Seed data needed:
- Two checking accounts: `"BPI Savings"` (balance 50000) and `"BDO Savings"` (balance 30000)
- One income transaction on BPI: name `"Salary"`, amount 20000, no description
- One transfer transaction from BPI to BDO: name `"Monthly Transfer"`, amount 5000, no notes
- One credit card (if testing credit card transfer path)

#### Test cases

1. `should update income transaction date without touching description` — Navigate to the income transaction in Accounts > BPI. Click edit. Change only the date. Submit. Expect success toast. Expect updated date visible in the list. (Regression: previously 400'd because description was null.)

2. `should update income transaction name only` — Edit income transaction, change name to `"Salary Updated"`. Submit. Expect success toast and updated name in list.

3. `should update income transaction account and verify balance changes` — Edit income transaction, change account from BPI to BDO. Submit. Expect success toast. Navigate to BPI account — balance should decrease by 20000 (income removed). Navigate to BDO account — balance should increase by 20000 (income applied).

4. `should update transfer transaction date without touching notes` — Navigate to transfer transaction. Click edit. Change only the date. Submit. Expect success toast. (Regression: previously 400'd because notes was null and amount coerced to number.)

5. `should update transfer transaction amount` — Edit transfer, change amount from 5000 to 8000. Submit. Expect success toast. Verify BPI balance decreased by additional 3000, BDO balance increased by additional 3000.

---

---

## Layer 3: Extended E2E Tests (Phase 4)

### File: `tests/e2e/transactions.spec.ts` — new describe block `"Transaction updates — extended"`

#### Seed data (beforeAll, all IDs prefixed `p4-`, use `upsert` with `update: {}`)

| ID | Name | Type | Initial balance |
|---|---|---|---|
| `p4-income-account-a` | P4 Income A | CHECKING | 100,000 |
| `p4-income-account-b` | P4 Income B | CHECKING | 50,000 |
| `p4-transfer-from` | P4 Transfer From | SAVINGS | 80,000 |
| `p4-transfer-to` | P4 Transfer To | SAVINGS | 40,000 |
| `p4-transfer-alt` | P4 Transfer Alt | SAVINGS | 60,000 |
| `p4-expense-account-a` | P4 Expense A | CHECKING | 70,000 |
| `p4-expense-account-b` | P4 Expense B | CHECKING | 30,000 |

Seed one income, transfer, and expense transaction per test case (see plan task 4.1 for full list). All nullable fields (`description`, `notes`) are seeded as `null` to represent the real-world state that triggered the original bug.

#### Balance assertion helper

Implement `getAccountBalance(page, accountName): Promise<number>` that:
1. Navigates to `/accounts`
2. Finds the account card containing that name
3. Reads and parses the balance text (strip `₱`, commas) and returns a number

Use this before and after edits to compute expected deltas instead of hardcoding absolute values — this makes tests resilient to balance state accumulated from earlier tests.

#### Income combination tests

| Test | Fields changed | Balance assertion |
|---|---|---|
| Amount only | amount: 5000 → 7000 | P4 Income A += 2000 |
| Name + description | name, description | No balance change — only check toast + name in table |
| Account change only | accountId: A → B | A -= 10000, B += 10000 |
| Amount + account | amount: 3000 → 4500, accountId: A → B | A -= 3000 (old removed), B += 4500 (new applied) |

#### Transfer combination tests

| Test | Fields changed | Balance assertion |
|---|---|---|
| Name + notes | name, notes | No balance change |
| Amount + date | amount: 5000 → 8000, date | From -= 3000, To += 3000 |
| fromAccount only | fromAccountId: From → Alt | From += 7000 (reversed), Alt -= 7000 (applied), To unchanged |
| toAccount only | toAccountId: To → Alt | From unchanged, To -= 4000 (reversed), Alt += 4000 (applied) |
| **Both accounts** | fromAccountId: From → Alt, toAccountId: To → Income B | From += 6000, To -= 6000, Alt -= 6000, Income B += 6000 |

The "both accounts" test is the direct regression guard for the `accountsChanged` (`===` → `!==`) fix.

#### Expense update tests

| Test | Fields changed | Balance assertion |
|---|---|---|
| Date only | date | No balance change — regression guard (no 400 on null description) |
| Name only | name | No balance change — check name in table |
| Amount only | amount: 3000 → 5000 | Expense A -= 2000 |
| Account change | accountId: A → B | A += 4500 (expense reversed), B -= 4500 (expense moved) |
| Amount + name + description | amount: 1000 → 1800, name, description | Expense A -= 800 |

---

## Notes for QA Agent

- **Do not run `prisma migrate`** — no schema changes in this fix.
- The unit tests should mock `db.$transaction` as: `vi.fn((fn) => fn(mockTx))` where `mockTx` mirrors the same mock methods as `db`.
- For balance assertions in unit tests, check that the mocked `financialAccount.update` (or `tx.financialAccount.update`) was called with the correct `data.currentBalance` increment/decrement values. Use `expect(mockTx.financialAccount.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "account-a" }, data: { currentBalance: { increment: 1000 } } }))`.
- For E2E balance assertions, read account balance from the account detail page heading or balance display element.
- Reference `tests/e2e/transactions.spec.ts` for the existing Playwright patterns (seeding, session creation, page navigation).
- Reference `src/app/api/expense-transactions/route.test.ts` for the existing Vitest mock patterns.
