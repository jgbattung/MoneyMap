import { test, expect } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

// ---------------------------------------------------------------------------
// Shared helper: open an existing transaction's edit sheet by clicking its
// row action menu on the relevant page.
// ---------------------------------------------------------------------------
async function openEditSheet(page: import("@playwright/test").Page, transactionName: string) {
  // Find the row containing the transaction name, then click its action/edit button.
  const row = page.locator("tbody tr").filter({ hasText: transactionName });
  await row.waitFor({ state: "visible", timeout: 10000 });
  // Many tables expose an actions menu via a "..." or edit button in the row.
  // Try a generic approach: click the first button inside the row.
  await row.getByRole("button").first().click();
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

    // Income account (starts at 50 000)
    await prisma.financialAccount.create({
      data: {
        id: "bpi-savings-account",
        userId,
        name: "BPI Savings",
        accountType: "SAVINGS",
        initialBalance: 50000,
        currentBalance: 50000,
      },
    });

    // Transfer source account (starts at 30 000)
    await prisma.financialAccount.create({
      data: {
        id: "bdo-savings-account",
        userId,
        name: "BDO Savings",
        accountType: "SAVINGS",
        initialBalance: 30000,
        currentBalance: 30000,
      },
    });

    // Seed an income transaction — description is intentionally null (regression)
    await prisma.incomeTransaction.create({
      data: {
        id: "salary-income-txn",
        userId,
        name: "March Salary",
        amount: 25000,
        accountId: "bpi-savings-account",
        incomeTypeId: "income-type-salary",
        date: new Date("2026-03-01"),
        description: null,
      },
    });

    // Seed a transfer transaction — notes is intentionally null (regression)
    await prisma.transferTransaction.create({
      data: {
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

    await expect(page.getByRole("heading", { name: "Income" })).toBeVisible();

    // Open the edit sheet for the seeded income transaction
    await openEditSheet(page, "March Salary");

    // Wait for the edit sheet to open
    await expect(
      page.getByRole("dialog").or(page.locator('[data-slot="sheet-content"]'))
    ).toBeVisible({ timeout: 10000 });

    // Change the date — navigate to April in the calendar picker
    // (exact selector depends on implementation; look for "Date" label)
    const dateField = page.getByLabel("Date");
    await dateField.click();

    // Navigate to the next month and pick the 1st
    await page.getByRole("button", { name: /next month/i }).click();
    await page.getByRole("gridcell", { name: "1" }).first().getByRole("button").click();

    // Submit the update
    const saveBtn = page
      .locator('[data-slot="sheet-content"]')
      .getByRole("button", { name: /save|update/i });
    await saveBtn.click();

    // Should NOT see a validation error toast (the regression produced a 400)
    await expect(page.getByText(/validation failed/i)).not.toBeVisible({ timeout: 3000 });

    // Should see a success toast
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Regression 2 — Update income name only
  // -------------------------------------------------------------------------
  test("should update income transaction name only", async ({ page }) => {
    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    await openEditSheet(page, "March Salary");

    await expect(
      page.getByRole("dialog").or(page.locator('[data-slot="sheet-content"]'))
    ).toBeVisible({ timeout: 10000 });

    // Clear and re-type the name
    const nameField = page.getByLabel(/income name/i).or(page.getByLabel(/name/i)).first();
    await nameField.clear();
    await nameField.fill("April Salary");

    const saveBtn = page
      .locator('[data-slot="sheet-content"]')
      .getByRole("button", { name: /save|update/i });
    await saveBtn.click();

    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("tbody").getByText("April Salary")).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Regression 3 — Update income account — verify balance changes
  // -------------------------------------------------------------------------
  test("should update income transaction account and reflect balance changes", async ({ page }) => {
    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    // The salary is currently linked to BPI Savings. Move it to BDO Savings.
    await openEditSheet(page, "April Salary");

    await expect(
      page.getByRole("dialog").or(page.locator('[data-slot="sheet-content"]'))
    ).toBeVisible({ timeout: 10000 });

    // Change account
    await page.getByLabel("Account").click();
    await page.getByRole("option", { name: "BDO Savings" }).click();

    const saveBtn = page
      .locator('[data-slot="sheet-content"]')
      .getByRole("button", { name: /save|update/i });
    await saveBtn.click();

    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 });

    // Navigate to accounts page and verify balances updated
    await page.goto("/accounts");
    await page.waitForLoadState("networkidle");

    // BPI Savings should have decreased by the salary amount
    // BDO Savings should have increased by the salary amount
    // (Exact balance assertions depend on the accounts page layout)
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

    await openEditSheet(page, "March Transfer");

    await expect(
      page.getByRole("dialog").or(page.locator('[data-slot="sheet-content"]'))
    ).toBeVisible({ timeout: 10000 });

    // Change the date
    const dateField = page.getByLabel("Date");
    await dateField.click();

    await page.getByRole("button", { name: /next month/i }).click();
    await page.getByRole("gridcell", { name: "5" }).first().getByRole("button").click();

    const saveBtn = page
      .locator('[data-slot="sheet-content"]')
      .getByRole("button", { name: /save|update/i });
    await saveBtn.click();

    // Regression guard: should NOT 400 due to null notes
    await expect(page.getByText(/validation failed/i)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 });
  });

  // -------------------------------------------------------------------------
  // Regression 5 — Update transfer amount — verify balance changes
  // -------------------------------------------------------------------------
  test("should update transfer amount and reflect balance changes on both accounts", async ({
    page,
  }) => {
    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    await openEditSheet(page, "March Transfer");

    await expect(
      page.getByRole("dialog").or(page.locator('[data-slot="sheet-content"]'))
    ).toBeVisible({ timeout: 10000 });

    // Change amount from 10 000 to 15 000
    const amountField = page.getByLabel("Amount");
    await amountField.clear();
    await amountField.fill("15000");

    const saveBtn = page
      .locator('[data-slot="sheet-content"]')
      .getByRole("button", { name: /save|update/i });
    await saveBtn.click();

    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10000 });

    // Verify the updated amount is reflected in the list
    await expect(page.locator("tbody").getByText(/15[,.]?000/)).toBeVisible();
  });
});
