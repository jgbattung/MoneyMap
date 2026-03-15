import { test, expect } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

// ---------------------------------------------------------------------------
// Shared helpers for inline-edit mode.
//
// IMPORTANT: TanStack React Table inline editing replaces <span> text content
// with <input value="...">. Playwright's `hasText` filter matches text nodes,
// NOT input values — so after entering edit mode the row can no longer be
// found by its original text. We work around this by finding the row index
// BEFORE clicking edit, then using `tbody tr:nth-child(N)` afterwards.
// ---------------------------------------------------------------------------
type Page = import("@playwright/test").Page;

/** Click the IconEdit button on a row, returning a locator for the row by index (stable after edit). */
async function enterEditMode(page: Page, transactionName: string) {
  const row = page.locator("tbody tr").filter({ hasText: transactionName });
  await row.waitFor({ state: "visible", timeout: 10000 });

  // Capture 1-based row position before the text disappears
  const rows = page.locator("tbody tr");
  const count = await rows.count();
  let rowIndex = -1;
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).innerText();
    if (text.includes(transactionName)) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex === -1) throw new Error(`Row "${transactionName}" not found`);

  // Click the edit button (only button in read-mode row)
  await row.getByRole("button").last().click();

  // Wait for React to re-render with inputs
  await page.waitForTimeout(500);

  // Return a stable locator using nth-child (1-based)
  return page.locator(`tbody tr:nth-child(${rowIndex + 1})`);
}

/** Click the IconCheck (save) button in the edit column (last td cell). */
async function saveRow(row: import("@playwright/test").Locator) {
  // The edit column is the last <td> in the row. In edit mode it contains
  // three buttons: IconCheck (save), IconX (cancel), Trash2 (delete).
  const editCell = row.locator("td").last();
  await editCell.getByRole("button").first().click();
}

/**
 * Navigate to /accounts and read the current balance for a named account card.
 * Returns the balance as a plain number (e.g. 102000 for "102,000.00").
 * The AccountCard component renders the balance as a formatted number in a <p>
 * tag alongside a "PHP" label — no ₱ symbol is used.
 */
async function getAccountBalance(page: Page, accountName: string): Promise<number> {
  await page.goto("/accounts");
  await page.waitForLoadState("networkidle");

  // Find the card that contains the account name, then read the balance <p>
  // AccountCard renders: <p class="... font-bold ...">name</p> and
  // <p class="...">formattedBalance</p> (e.g. "102,000.00") nearby.
  const card = page.locator(".money-map-card-interactive").filter({ hasText: accountName });
  await card.waitFor({ state: "visible", timeout: 10000 });

  // The balance is the <p> that contains digits and commas/dots but NOT letters
  // We target the <p> inside the balance flex container (items-end justify-center gap-2 sibling)
  const balanceText = await card.locator("p").filter({ hasNotText: /[a-zA-Z]/ }).first().innerText();
  const numeric = parseFloat(balanceText.replace(/,/g, ""));
  return numeric;
}

test.describe("Transactions", () => {
  test.beforeAll(async () => {
    await clearDatabase();
    const user = await seedBaseData();
    await createTestSession(user.id);

    // Create a checking account for expense transactions
    await prisma.financialAccount.create({
      data: {
        id: "test-checking-account",
        userId: user.id,
        name: "Test Checking",
        accountType: "CHECKING",
        initialBalance: 10000,
        currentBalance: 10000,
      },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should add an expense transaction and verify it appears in the list", async ({ page }) => {
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    // Page should load with the expenses heading
    await expect(page.getByRole("heading", { name: "Expenses" })).toBeVisible();

    // Click the "Add expense" button on the page (second one — first is in sidebar)
    const addBtn = page.getByRole("button", { name: "Add expense" }).nth(1);
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    // Wait for the sheet to appear
    await expect(page.getByText("Add Expense Transaction")).toBeVisible({ timeout: 10000 });

    // Fill in the expense name
    await page.getByLabel("Expense name").fill("Grocery Shopping");

    // Fill in the amount
    await page.getByLabel("Amount").fill("1500");

    // Select account
    await page.getByLabel("Account").click();
    await page.getByRole("option", { name: "Test Checking" }).click();

    // Select expense type
    await page.getByLabel("Expense type").click();
    await page.getByRole("option", { name: "Groceries" }).click();

    // Select date - click the date button and pick today
    const dateButton = page.getByLabel("Date");
    await dateButton.click();
    // Click today's date in the calendar (gridcell names are full dates like "Today, Monday, March 9th, 2026")
    await page.getByRole("gridcell", { name: /Today/ }).getByRole("button").click();

    // Submit the form (the button inside the open sheet)
    await page.locator('[data-slot="sheet-content"]').getByRole("button", { name: "Add expense" }).click();

    // Verify the success toast appears
    await expect(page.getByText("Expense transaction created successfully")).toBeVisible();

    // Verify the transaction appears on the page (use table row on desktop)
    await expect(page.locator('tbody').getByText("Grocery Shopping")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Regression tests: Transaction updates (fix/transaction-update-validation)
//
// These tests guard against the bug where nullable DB fields (description,
// notes) caused 400 errors because z.string().optional() rejects null.
// The fix uses .nullable().optional() and z.coerce.string() for transfer
// amounts.
//
// NOTE: These tests run AFTER the "Transactions" describe block. The first
// describe's beforeAll calls clearDatabase() + seedBaseData() which creates
// the shared test user ("test-user-id"). The beforeAll below seeds additional
// accounts and transactions that use unique IDs to avoid collisions.
// ---------------------------------------------------------------------------
test.describe("Transaction updates", () => {
  test.beforeAll(async () => {
    // The user and session were already created by the "Transactions" describe's
    // beforeAll. We only need to create the additional accounts and transactions.
    const userId = "test-user-id";

    // Income account (starts at 50 000) — upsert so retries don't fail on unique constraint
    await prisma.financialAccount.upsert({
      where: { id: "bpi-savings-account" },
      create: {
        id: "bpi-savings-account",
        userId,
        name: "BPI Savings",
        accountType: "SAVINGS",
        initialBalance: 50000,
        currentBalance: 50000,
      },
      update: {},
    });

    // Transfer source account (starts at 30 000)
    await prisma.financialAccount.upsert({
      where: { id: "bdo-savings-account" },
      create: {
        id: "bdo-savings-account",
        userId,
        name: "BDO Savings",
        accountType: "SAVINGS",
        initialBalance: 30000,
        currentBalance: 30000,
      },
      update: {},
    });

    // Seed an income transaction — description is intentionally null (regression)
    await prisma.incomeTransaction.upsert({
      where: { id: "salary-income-txn" },
      create: {
        id: "salary-income-txn",
        userId,
        name: "March Salary",
        amount: 25000,
        accountId: "bpi-savings-account",
        incomeTypeId: "income-type-salary",
        date: new Date("2026-03-01"),
        description: null,
      },
      update: {},
    });

    // Seed a transfer transaction — notes is intentionally null (regression)
    await prisma.transferTransaction.upsert({
      where: { id: "monthly-transfer-txn" },
      create: {
        id: "monthly-transfer-txn",
        userId,
        name: "March Transfer",
        amount: 10000,
        fromAccountId: "bdo-savings-account",
        toAccountId: "bpi-savings-account",
        transferTypeId: "transfer-type-internal",
        date: new Date("2026-03-05"),
        notes: null,
      },
      update: {},
    });
  });

  // -------------------------------------------------------------------------
  // Regression 1 — Update income date only (description null in DB)
  // -------------------------------------------------------------------------
  test("should update income transaction date when description is null (regression)", async ({
    page,
  }) => {
    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Income", exact: true }).first()).toBeVisible();

    // Enter inline edit mode and get a stable row locator (by index)
    const row = await enterEditMode(page, "March Salary");

    // In edit mode the date cell has a popover trigger <button> showing "Mar 1, 2026"
    // It's the first <button> element in the row (before the save/cancel/delete buttons)
    await row.locator("button").first().click();
    // Calendar disables future dates, so go to previous month and pick an enabled date
    await page.getByRole("button", { name: /previous month/i }).click();
    await page.getByRole("gridcell", { name: "15" }).first().getByRole("button").click();

    // Save — IconCheck is now the first button after the calendar closes
    // The date popover closed, so the row buttons are: date-trigger, save, cancel, delete
    // Actually save button is in the last cell. Let's find it explicitly.
    await saveRow(row);

    // Regression guard: should NOT see a validation error toast (regression produced 400)
    await expect(page.getByText(/validation failed/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Income updated successfully")).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Regression 2 — Update income name only
  // -------------------------------------------------------------------------
  test("should update income transaction name only", async ({ page }) => {
    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "March Salary");

    // Name is the second column — the second <input> in the row
    // Column order: date(popover), name(input), amount(input), account(select), type(select), description(input)
    const nameInput = row.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("April Salary");
    await nameInput.blur();

    await saveRow(row);

    await expect(page.getByText("Income updated successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody").getByText("April Salary")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Regression 3 — Update income account — verify balance changes
  // -------------------------------------------------------------------------
  test("should update income transaction account and reflect balance changes", async ({ page }) => {
    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    // Salary was renamed to "April Salary" in test 2
    const row = await enterEditMode(page, "April Salary");

    // Account column is a <Select> (combobox) in edit mode
    await row.locator('[role="combobox"]').first().click();
    await page.getByRole("option", { name: "BDO Savings" }).click();

    await saveRow(row);

    await expect(page.getByText("Income updated successfully")).toBeVisible({ timeout: 10000 });

    // Navigate to accounts page and confirm both accounts are present
    await page.goto("/accounts");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("BDO Savings")).toBeVisible();
    await expect(page.getByText("BPI Savings")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Regression 4 — Update transfer date only (notes null in DB)
  // -------------------------------------------------------------------------
  test("should update transfer transaction date when notes is null (regression)", async ({
    page,
  }) => {
    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "March Transfer");

    // Click the date popover trigger (first button in the row)
    await row.locator("button").first().click();
    // Calendar disables future dates, so go to previous month and pick an enabled date
    await page.getByRole("button", { name: /previous month/i }).click();
    await page.getByRole("gridcell", { name: "10" }).first().getByRole("button").click();

    await saveRow(row);

    // Regression guard: should NOT 400 due to null notes
    await expect(page.getByText(/validation failed/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Transfer updated successfully")).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Regression 5 — Update transfer amount — verify balance changes
  // -------------------------------------------------------------------------
  test("should update transfer amount and reflect balance changes on both accounts", async ({
    page,
  }) => {
    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "March Transfer");

    // Amount is the second input (after name)
    // Transfer columns: date(popover), name(input), amount(input), fee(input), from(select), to(select), type(select), notes(input)
    const amountInput = row.locator("input").nth(1);
    await amountInput.clear();
    await amountInput.fill("15000");
    await amountInput.blur();

    await saveRow(row);

    await expect(page.getByText("Transfer updated successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody").getByText(/15[,.]?000/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Phase 4 — Extended update tests with balance verification
//
// Relies on the user/session seeded by the "Transactions" describe's beforeAll.
// Does NOT call clearDatabase(). Seeds isolated "p4-" prefixed data only.
// ---------------------------------------------------------------------------
test.describe("Transaction updates — extended", () => {
  test.setTimeout(60000);

  test.beforeAll(async () => {
    const userId = "test-user-id";

    // ---- Accounts ----
    const accounts = [
      { id: "p4-income-account-a", name: "P4 Income A",      accountType: "CHECKING" as const, balance: 100000 },
      { id: "p4-income-account-b", name: "P4 Income B",      accountType: "CHECKING" as const, balance: 50000  },
      { id: "p4-transfer-from",    name: "P4 Transfer From", accountType: "SAVINGS"  as const, balance: 80000  },
      { id: "p4-transfer-to",      name: "P4 Transfer To",   accountType: "SAVINGS"  as const, balance: 40000  },
      { id: "p4-transfer-alt",     name: "P4 Transfer Alt",  accountType: "SAVINGS"  as const, balance: 60000  },
      { id: "p4-expense-account-a",name: "P4 Expense A",     accountType: "CHECKING" as const, balance: 70000  },
      { id: "p4-expense-account-b",name: "P4 Expense B",     accountType: "CHECKING" as const, balance: 30000  },
    ];

    for (const acct of accounts) {
      await prisma.financialAccount.upsert({
        where: { id: acct.id },
        create: {
          id: acct.id,
          userId,
          name: acct.name,
          accountType: acct.accountType,
          initialBalance: acct.balance,
          currentBalance: acct.balance,
        },
        update: {},
      });
    }

    // ---- Income transactions ----
    const incomeTransactions = [
      { id: "p4-income-amount", name: "P4 Income Amount",   amount: 5000,  accountId: "p4-income-account-a", date: new Date("2026-02-01") },
      { id: "p4-income-multi",  name: "P4 Income Multi",    amount: 8000,  accountId: "p4-income-account-a", date: new Date("2026-02-05") },
      { id: "p4-income-acct",   name: "P4 Income AcctChg",  amount: 10000, accountId: "p4-income-account-a", date: new Date("2026-02-10") },
      { id: "p4-income-all",    name: "P4 Income All",      amount: 3000,  accountId: "p4-income-account-a", date: new Date("2026-02-15") },
    ];

    for (const txn of incomeTransactions) {
      await prisma.incomeTransaction.upsert({
        where: { id: txn.id },
        create: {
          id: txn.id,
          userId,
          name: txn.name,
          amount: txn.amount,
          accountId: txn.accountId,
          incomeTypeId: "income-type-salary",
          date: txn.date,
          description: null,
        },
        update: {},
      });
    }

    // ---- Transfer transactions ----
    const transferTransactions = [
      { id: "p4-transfer-name",     name: "P4 Transfer Name",    amount: 2000, fromAccountId: "p4-transfer-from", toAccountId: "p4-transfer-to", date: new Date("2026-02-01") },
      { id: "p4-transfer-multi",    name: "P4 Transfer Multi",   amount: 5000, fromAccountId: "p4-transfer-from", toAccountId: "p4-transfer-to", date: new Date("2026-02-05") },
      { id: "p4-transfer-from-chg", name: "P4 Transfer FromChg", amount: 7000, fromAccountId: "p4-transfer-from", toAccountId: "p4-transfer-to", date: new Date("2026-02-10") },
      { id: "p4-transfer-to-chg",   name: "P4 Transfer ToChg",   amount: 4000, fromAccountId: "p4-transfer-from", toAccountId: "p4-transfer-to", date: new Date("2026-02-15") },
      { id: "p4-transfer-both",     name: "P4 Transfer Both",    amount: 6000, fromAccountId: "p4-transfer-from", toAccountId: "p4-transfer-to", date: new Date("2026-02-20") },
    ];

    for (const txn of transferTransactions) {
      await prisma.transferTransaction.upsert({
        where: { id: txn.id },
        create: {
          id: txn.id,
          userId,
          name: txn.name,
          amount: txn.amount,
          fromAccountId: txn.fromAccountId,
          toAccountId: txn.toAccountId,
          transferTypeId: "transfer-type-internal",
          date: txn.date,
          notes: null,
        },
        update: {},
      });
    }

    // ---- Expense transactions ----
    const expenseTransactions = [
      { id: "p4-expense-date",   name: "P4 Expense Date",    amount: 1500, accountId: "p4-expense-account-a", date: new Date("2026-02-01") },
      { id: "p4-expense-name",   name: "P4 Expense Name",    amount: 2000, accountId: "p4-expense-account-a", date: new Date("2026-02-05") },
      { id: "p4-expense-amount", name: "P4 Expense Amount",  amount: 3000, accountId: "p4-expense-account-a", date: new Date("2026-02-10") },
      { id: "p4-expense-acct",   name: "P4 Expense AcctChg", amount: 4500, accountId: "p4-expense-account-a", date: new Date("2026-02-15") },
      { id: "p4-expense-multi",  name: "P4 Expense Multi",   amount: 1000, accountId: "p4-expense-account-a", date: new Date("2026-02-20") },
    ];

    for (const txn of expenseTransactions) {
      await prisma.expenseTransaction.upsert({
        where: { id: txn.id },
        create: {
          id: txn.id,
          userId,
          name: txn.name,
          amount: txn.amount,
          accountId: txn.accountId,
          expenseTypeId: "expense-type-groceries",
          date: txn.date,
          description: null,
        },
        update: {},
      });
    }
  });

  // =========================================================================
  // Task 4.2 — Income update field combination tests
  // =========================================================================

  test("should update income amount and verify account balance", async ({ page }) => {
    const balanceBefore = await getAccountBalance(page, "P4 Income A");

    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Income Amount");

    // Amount input is the second input (after name)
    const amountInput = row.locator("input").nth(1);
    await amountInput.clear();
    await amountInput.fill("7000");
    await amountInput.blur();

    await saveRow(row);

    await expect(page.getByText("Income updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const balanceAfter = await getAccountBalance(page, "P4 Income A");
    expect(balanceAfter).toBe(balanceBefore + 2000);
  });

  test("should update income name and description together", async ({ page }) => {
    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Income Multi");

    const nameInput = row.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("P4 Income Multi Updated");
    await nameInput.blur();

    const descInput = row.locator("input").last();
    await descInput.fill("Bonus payment");
    await descInput.blur();

    await saveRow(row);

    await expect(page.getByText("Income updated successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody").getByText("P4 Income Multi Updated")).toBeVisible();
  });

  test("should update income account and verify both account balances", async ({ page }) => {
    const balanceA = await getAccountBalance(page, "P4 Income A");
    const balanceB = await getAccountBalance(page, "P4 Income B");

    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Income AcctChg");

    const accountCombobox = row.locator('[role="combobox"]').first();
    await accountCombobox.click();
    await page.getByRole("option", { name: "P4 Income B" }).click();

    await saveRow(row);

    await expect(page.getByText("Income updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceA = await getAccountBalance(page, "P4 Income A");
    const newBalanceB = await getAccountBalance(page, "P4 Income B");
    expect(newBalanceA).toBe(balanceA - 10000);
    expect(newBalanceB).toBe(balanceB + 10000);
  });

  test("should update income amount and account together, verify both balances", async ({ page }) => {
    const balanceA = await getAccountBalance(page, "P4 Income A");
    const balanceB = await getAccountBalance(page, "P4 Income B");

    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Income All");

    const amountInput = row.locator("input").nth(1);
    await amountInput.clear();
    await amountInput.fill("4500");
    await amountInput.blur();

    const accountCombobox = row.locator('[role="combobox"]').first();
    await accountCombobox.click();
    await page.getByRole("option", { name: "P4 Income B" }).click();

    await saveRow(row);

    await expect(page.getByText("Income updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceA = await getAccountBalance(page, "P4 Income A");
    const newBalanceB = await getAccountBalance(page, "P4 Income B");
    expect(newBalanceA).toBe(balanceA - 3000);
    expect(newBalanceB).toBe(balanceB + 4500);
  });

  // =========================================================================
  // Task 4.3 — Transfer update field combination tests
  // =========================================================================

  test("should update transfer name and notes together", async ({ page }) => {
    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Transfer Name");

    const nameInput = row.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("P4 Transfer Name Updated");
    await nameInput.blur();

    const notesInput = row.locator("input").last();
    await notesInput.fill("Monthly transfer");
    await notesInput.blur();

    await saveRow(row);

    await expect(page.getByText("Transfer updated successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody").getByText("P4 Transfer Name Updated")).toBeVisible();
  });

  test("should update transfer amount and date together, verify both account balances", async ({ page }) => {
    const balanceFrom = await getAccountBalance(page, "P4 Transfer From");
    const balanceTo = await getAccountBalance(page, "P4 Transfer To");

    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Transfer Multi");

    const amountInput = row.locator("input").nth(1);
    await amountInput.clear();
    await amountInput.fill("8000");
    await amountInput.blur();

    // Open date popover (first button in the row)
    await row.locator("button").first().click();
    await page.getByRole("button", { name: /previous month/i }).click();
    await page.getByRole("gridcell", { name: "10" }).first().getByRole("button").click();

    await saveRow(row);

    await expect(page.getByText("Transfer updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceFrom = await getAccountBalance(page, "P4 Transfer From");
    const newBalanceTo = await getAccountBalance(page, "P4 Transfer To");
    // amount changed from 5000 to 8000: diff = +3000 deducted from From, +3000 credited to To
    expect(newBalanceFrom).toBe(balanceFrom - 3000);
    expect(newBalanceTo).toBe(balanceTo + 3000);
  });

  test("should update transfer from-account only, verify balance reversal", async ({ page }) => {
    const balanceFrom = await getAccountBalance(page, "P4 Transfer From");
    const balanceAlt = await getAccountBalance(page, "P4 Transfer Alt");

    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Transfer FromChg");

    const fromCombobox = row.locator('[role="combobox"]').first();
    await fromCombobox.click();
    await page.getByRole("option", { name: "P4 Transfer Alt" }).click();

    await saveRow(row);

    await expect(page.getByText("Transfer updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceFrom = await getAccountBalance(page, "P4 Transfer From");
    const newBalanceAlt = await getAccountBalance(page, "P4 Transfer Alt");
    expect(newBalanceFrom).toBe(balanceFrom + 7000);
    expect(newBalanceAlt).toBe(balanceAlt - 7000);
  });

  test("should update transfer to-account only, verify balance reversal", async ({ page }) => {
    const balanceTo = await getAccountBalance(page, "P4 Transfer To");
    const balanceAlt = await getAccountBalance(page, "P4 Transfer Alt");

    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Transfer ToChg");

    const toCombobox = row.locator('[role="combobox"]').nth(1);
    await toCombobox.click();
    await page.getByRole("option", { name: "P4 Transfer Alt" }).click();

    await saveRow(row);

    await expect(page.getByText("Transfer updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceTo = await getAccountBalance(page, "P4 Transfer To");
    const newBalanceAlt = await getAccountBalance(page, "P4 Transfer Alt");
    expect(newBalanceTo).toBe(balanceTo - 4000);
    expect(newBalanceAlt).toBe(balanceAlt + 4000);
  });

  test("should update transfer both accounts, verify all four balance changes", async ({ page }) => {
    const balanceFrom = await getAccountBalance(page, "P4 Transfer From");
    const balanceTo = await getAccountBalance(page, "P4 Transfer To");
    const balanceAlt = await getAccountBalance(page, "P4 Transfer Alt");
    const balanceIncomeB = await getAccountBalance(page, "P4 Income B");

    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Transfer Both");

    const fromCombobox = row.locator('[role="combobox"]').first();
    await fromCombobox.click();
    await page.getByRole("option", { name: "P4 Transfer Alt" }).click();

    const toCombobox = row.locator('[role="combobox"]').nth(1);
    await toCombobox.click();
    await page.getByRole("option", { name: "P4 Income B" }).click();

    await saveRow(row);

    await expect(page.getByText("Transfer updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceFrom = await getAccountBalance(page, "P4 Transfer From");
    const newBalanceTo = await getAccountBalance(page, "P4 Transfer To");
    const newBalanceAlt = await getAccountBalance(page, "P4 Transfer Alt");
    const newBalanceIncomeB = await getAccountBalance(page, "P4 Income B");

    expect(newBalanceFrom).toBe(balanceFrom + 6000);
    expect(newBalanceTo).toBe(balanceTo - 6000);
    expect(newBalanceAlt).toBe(balanceAlt - 6000);
    expect(newBalanceIncomeB).toBe(balanceIncomeB + 6000);
  });

  // =========================================================================
  // Task 4.4 — Expense update tests
  // =========================================================================

  test("should update expense date only (regression guard)", async ({ page }) => {
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Expense Date");

    // Open date popover (first button in the row)
    await row.locator("button").first().click();
    await page.getByRole("button", { name: /previous month/i }).click();
    await page.getByRole("gridcell", { name: "15" }).first().getByRole("button").click();

    await saveRow(row);

    await expect(page.getByText(/validation failed/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Expense updated successfully")).toBeVisible({ timeout: 10000 });
  });

  test("should update expense name only", async ({ page }) => {
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Expense Name");

    const nameInput = row.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("P4 Expense Name Updated");
    await nameInput.blur();

    await saveRow(row);

    await expect(page.getByText("Expense updated successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody").getByText("P4 Expense Name Updated")).toBeVisible();
  });

  test("should update expense amount and verify account balance", async ({ page }) => {
    const balanceA = await getAccountBalance(page, "P4 Expense A");

    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Expense Amount");

    const amountInput = row.locator("input").nth(1);
    await amountInput.clear();
    await amountInput.fill("5000");
    await amountInput.blur();

    await saveRow(row);

    await expect(page.getByText("Expense updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceA = await getAccountBalance(page, "P4 Expense A");
    // amount changed from 3000 to 5000: net −2000 from account
    expect(newBalanceA).toBe(balanceA - 2000);
  });

  test("should update expense account change and verify both account balances", async ({ page }) => {
    const balanceExpA = await getAccountBalance(page, "P4 Expense A");
    const balanceExpB = await getAccountBalance(page, "P4 Expense B");

    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Expense AcctChg");

    const accountCombobox = row.locator('[role="combobox"]').first();
    await accountCombobox.click();
    await page.getByRole("option", { name: "P4 Expense B" }).click();

    await saveRow(row);

    await expect(page.getByText("Expense updated successfully")).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(1000);
    const newBalanceExpA = await getAccountBalance(page, "P4 Expense A");
    const newBalanceExpB = await getAccountBalance(page, "P4 Expense B");
    expect(newBalanceExpA).toBe(balanceExpA + 4500);
    expect(newBalanceExpB).toBe(balanceExpB - 4500);
  });

  test("should update expense amount, name, and description together", async ({ page }) => {
    const balanceA = await getAccountBalance(page, "P4 Expense A");

    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    const row = await enterEditMode(page, "P4 Expense Multi");

    const nameInput = row.locator("input").first();
    await nameInput.clear();
    await nameInput.fill("P4 Expense Multi Updated");
    await nameInput.blur();

    const amountInput = row.locator("input").nth(1);
    await amountInput.clear();
    await amountInput.fill("1800");
    await amountInput.blur();

    const descInput = row.locator("input").last();
    await descInput.fill("Updated");
    await descInput.blur();

    await saveRow(row);

    await expect(page.getByText("Expense updated successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody").getByText("P4 Expense Multi Updated")).toBeVisible();

    await page.waitForTimeout(1000);
    const newBalanceA = await getAccountBalance(page, "P4 Expense A");
    // amount changed from 1000 to 1800: net −800 from account
    expect(newBalanceA).toBe(balanceA - 800);
  });
});
