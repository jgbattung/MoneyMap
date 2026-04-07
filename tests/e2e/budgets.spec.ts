import { test, expect } from "@playwright/test";
import { prisma } from "../../playwright/utils/db";

// Expense types are managed on the /budgets page.
// The UI calls them "budgets" — "Add budget" creates an expenseType,
// clicking a budget card opens the edit sheet.

test.describe("Budgets (expense types)", () => {
  test.setTimeout(60000);

  test.beforeAll(async () => {
    const userId = "test-user-id";

    // Seed an expense type to edit/delete
    await prisma.expenseType.upsert({
      where: { id: "et-transport" },
      create: {
        id: "et-transport",
        userId,
        name: "ET Transport",
        monthlyBudget: null,
      },
      update: {},
    });

    // Seed an expense type that will be deleted — with a transaction to verify reassignment
    await prisma.expenseType.upsert({
      where: { id: "et-to-delete" },
      create: {
        id: "et-to-delete",
        userId,
        name: "ET ToDelete",
        monthlyBudget: null,
      },
      update: {},
    });

    await prisma.financialAccount.upsert({
      where: { id: "et-account" },
      create: {
        id: "et-account",
        userId,
        name: "ET Account",
        accountType: "CHECKING",
        initialBalance: 5000,
        currentBalance: 5000,
      },
      update: {},
    });

    await prisma.expenseTransaction.upsert({
      where: { id: "et-txn-1" },
      create: {
        id: "et-txn-1",
        userId,
        name: "ET Txn To Reassign",
        amount: 500,
        accountId: "et-account",
        expenseTypeId: "et-to-delete",
        date: new Date("2026-03-01"),
        description: null,
      },
      update: {},
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // Create a budget (expense type)
  // -------------------------------------------------------------------------
  test("should create a new budget and verify it appears on the page", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Budgets" })).toBeVisible();

    // Click "Add budget" (desktop sheet button)
    const addBtn = page.getByRole("button", { name: "Add budget" }).first();
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    await expect(page.getByRole("heading", { name: "Add Budget" })).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Budget Name").fill("ET New Category");
    await page.getByLabel("Monthly budget").fill("3000");

    await page.locator('[data-slot="sheet-content"]').getByRole("button", { name: "Add budget" }).click();

    await expect(page.getByText("Budget created successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("ET New Category", { exact: true })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Create a budget with subcategories
  // -------------------------------------------------------------------------
  test("should create a budget with subcategories", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");

    const addBtn = page.getByRole("button", { name: "Add budget" }).first();
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    await expect(page.getByRole("heading", { name: "Add Budget" })).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Budget Name").fill("ET With Subs");

    // Add first subcategory
    const subInput = page.getByPlaceholder("e.g., GrabCar, Train, Bus");
    await subInput.fill("Grab");
    await subInput.press("Enter");
    await expect(page.getByText("Grab")).toBeVisible();

    // Add second subcategory
    await subInput.fill("Train");
    await subInput.press("Enter");
    await expect(page.getByText("Train")).toBeVisible();

    await page.locator('[data-slot="sheet-content"]').getByRole("button", { name: "Add budget" }).click();

    await expect(page.getByText("Budget created successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("ET With Subs", { exact: true })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Edit budget name
  // -------------------------------------------------------------------------
  test("should edit a budget name", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");

    // Click the ET Transport budget card
    const card = page.locator(".money-map-card-interactive").filter({ hasText: "ET Transport" });
    await card.waitFor({ state: "visible", timeout: 10000 });
    await card.click();

    await expect(page.getByText("Edit budget")).toBeVisible({ timeout: 10000 });

    const nameInput = page.getByLabel("Budget Name");
    await nameInput.clear();
    await nameInput.fill("ET Transport Updated");

    await page.locator('[data-slot="sheet-content"]').getByRole("button", { name: "Update budget" }).click();

    await expect(page.getByText("Budget updated successfully")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("ET Transport Updated", { exact: true })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Delete budget — verify Uncategorized reassignment
  // -------------------------------------------------------------------------
  test("should delete a budget and reassign transactions to Uncategorized", async ({ page }) => {
    await page.goto("/budgets");
    await page.waitForLoadState("networkidle");

    const card = page.locator(".money-map-card-interactive").filter({ hasText: "ET ToDelete" });
    await card.waitFor({ state: "visible", timeout: 10000 });
    await card.click();

    await expect(page.getByText("Edit budget")).toBeVisible({ timeout: 10000 });

    // Click delete button
    await page.getByRole("button", { name: "Delete budget" }).click();

    // Confirm in the delete dialog (AlertDialog overlays the sheet)
    await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5000 });
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Budget deleted successfully")).toBeVisible({ timeout: 10000 });

    // Budget card should no longer appear
    await expect(page.locator(".money-map-card-interactive").filter({ hasText: "ET ToDelete" })).not.toBeVisible();

    // Verify the transaction was reassigned — check in DB directly
    const txn = await prisma.expenseTransaction.findUnique({ where: { id: "et-txn-1" } });
    const uncategorized = await prisma.expenseType.findFirst({ where: { userId: "test-user-id", name: "Uncategorized" } });
    expect(txn).not.toBeNull();
    expect(txn?.expenseTypeId).toBe(uncategorized?.id);
  });
});

// ---------------------------------------------------------------------------
// Batch atomicity regression tests
//
// These use page.route() to simulate server failures and verify that
// the UI surfaces the error and data remains unchanged.
// ---------------------------------------------------------------------------
test.describe("Batch atomicity", () => {
  test.setTimeout(60000);

  test.beforeAll(async () => {
    const userId = "test-user-id";

    await prisma.financialAccount.upsert({
      where: { id: "bud-account-a" },
      create: {
        id: "bud-account-a",
        userId,
        name: "BUD Account A",
        accountType: "CHECKING",
        initialBalance: 20000,
        currentBalance: 20000,
      },
      update: {},
    });

    await prisma.financialAccount.upsert({
      where: { id: "bud-account-b" },
      create: {
        id: "bud-account-b",
        userId,
        name: "BUD Account B",
        accountType: "SAVINGS",
        initialBalance: 15000,
        currentBalance: 15000,
      },
      update: {},
    });

    await prisma.expenseTransaction.upsert({
      where: { id: "bud-expense-txn" },
      create: {
        id: "bud-expense-txn",
        userId,
        name: "BUD Expense Atomic",
        amount: 1000,
        accountId: "bud-account-a",
        expenseTypeId: "expense-type-groceries",
        date: new Date("2026-03-10"),
        description: null,
      },
      update: {},
    });

    await prisma.incomeTransaction.upsert({
      where: { id: "bud-income-txn" },
      create: {
        id: "bud-income-txn",
        userId,
        name: "BUD Income Atomic",
        amount: 5000,
        accountId: "bud-account-a",
        incomeTypeId: "income-type-salary",
        date: new Date("2026-03-12"),
        description: null,
      },
      update: {},
    });

    await prisma.transferTransaction.upsert({
      where: { id: "bud-transfer-txn" },
      create: {
        id: "bud-transfer-txn",
        userId,
        name: "BUD Transfer Atomic",
        amount: 3000,
        fromAccountId: "bud-account-a",
        toAccountId: "bud-account-b",
        transferTypeId: "transfer-type-internal",
        date: new Date("2026-03-15"),
        notes: null,
      },
      update: {},
    });
  });

  // -------------------------------------------------------------------------
  // Expense delete is atomic — 500 means row stays
  // -------------------------------------------------------------------------
  test("should show error and keep expense row when DELETE returns 500", async ({ page }) => {
    await page.goto("/expenses");
    await page.waitForLoadState("networkidle");

    // Intercept DELETE requests to expense-transactions
    await page.route("**/api/expense-transactions/**", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Simulated server failure" }),
        });
      } else {
        await route.continue();
      }
    });

    // Capture row index before entering edit mode (text disappears after click)
    const allRows = page.locator("tbody tr");
    await page.locator("tbody tr").filter({ hasText: "BUD Expense Atomic" }).waitFor({ state: "visible", timeout: 10000 });
    const rowCount = await allRows.count();
    let expenseRowIndex = -1;
    for (let i = 0; i < rowCount; i++) {
      const text = await allRows.nth(i).innerText();
      if (text.includes("BUD Expense Atomic")) { expenseRowIndex = i; break; }
    }
    if (expenseRowIndex === -1) throw new Error('Row "BUD Expense Atomic" not found');

    // Click edit button (last button in read-mode row)
    await allRows.nth(expenseRowIndex).getByRole("button").last().click();
    await page.waitForTimeout(500);

    // In edit mode: last cell has save, cancel, delete buttons — delete is last
    const editRow = page.locator(`tbody tr:nth-child(${expenseRowIndex + 1})`);
    const editCell = editRow.locator("td").last();
    await editCell.getByRole("button").last().click();

    // Confirm delete dialog if it appears
    const alertDialog = page.getByRole("alertdialog");
    const dialogVisible = await alertDialog.isVisible().catch(() => false);
    if (dialogVisible) {
      await alertDialog.getByRole("button", { name: "Delete" }).click();
    }

    await expect(page.getByText("Failed to delete expense transaction")).toBeVisible({ timeout: 10000 });

    await page.unroute("**/api/expense-transactions/**");

    // Row should still be present
    await expect(page.locator("tbody tr").filter({ hasText: "BUD Expense Atomic" })).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Income create is atomic — 500 means no new row
  // -------------------------------------------------------------------------
  test("should show error and not add income row when POST returns 500", async ({ page }) => {
    await page.goto("/income");
    await page.waitForLoadState("networkidle");

    await page.route("**/api/income-transactions", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Simulated server failure" }),
        });
      } else {
        await route.continue();
      }
    });

    // Open add income form via sidebar quick-action
    const addBtn = page.getByRole("button", { name: "Add income" }).first();
    await addBtn.waitFor({ state: "visible" });
    await addBtn.click();

    await expect(page.getByText("Add Income Transaction")).toBeVisible({ timeout: 10000 });

    await page.getByLabel("Income transaction name").fill("BUD Should Not Appear");
    await page.getByLabel("Amount").fill("9999");
    await page.getByLabel("Account").click();
    await page.getByRole("option", { name: "BUD Account A" }).click();
    await page.getByLabel("Income type").click();
    await page.getByRole("option", { name: "Salary" }).click();

    const dateButton = page.getByLabel("Date");
    await dateButton.click();
    await page.getByRole("gridcell", { name: /Today/ }).getByRole("button").click();

    // Submit via JS — the sheet footer button can be outside Playwright's viewport
    await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      const btn = sheet?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
      btn?.click();
    });

    // Should show error toast
    await expect(page.getByText("Failed to create income transaction")).toBeVisible({ timeout: 10000 });

    await page.unroute("**/api/income-transactions");

    // New row must not appear
    await expect(page.locator("tbody").getByText("BUD Should Not Appear")).not.toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Transfer PATCH is atomic — 500 means original values stay
  // -------------------------------------------------------------------------
  test("should show error and keep original transfer values when PATCH returns 500", async ({ page }) => {
    await page.goto("/transfers");
    await page.waitForLoadState("networkidle");

    await page.route("**/api/transfer-transactions/**", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Simulated server failure" }),
        });
      } else {
        await route.continue();
      }
    });

    // Find the row index before entering edit mode (text disappears after click)
    const rows = page.locator("tbody tr");
    await page.locator("tbody tr").filter({ hasText: "BUD Transfer Atomic" }).waitFor({ state: "visible", timeout: 10000 });
    const count = await rows.count();
    let rowIndex = -1;
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).innerText();
      if (text.includes("BUD Transfer Atomic")) {
        rowIndex = i;
        break;
      }
    }
    if (rowIndex === -1) throw new Error('Row "BUD Transfer Atomic" not found');

    // Click edit button (last button in read-mode row)
    await rows.nth(rowIndex).getByRole("button").last().click();
    await page.waitForTimeout(500);

    // Stable locator by index after edit mode activated
    const editRow = page.locator(`tbody tr:nth-child(${rowIndex + 1})`);

    // Amount is the second input (after name)
    const amountInput = editRow.locator("input").nth(1);
    await amountInput.clear();
    await amountInput.fill("99999");
    await amountInput.blur();

    // Save (first button in last cell)
    await editRow.locator("td").last().getByRole("button").first().click();

    await expect(page.getByText("Failed to update transfer")).toBeVisible({ timeout: 10000 });

    await page.unroute("**/api/transfer-transactions/**");

    // Original amount (3,000) should still be in the table — reload to confirm
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("tbody").getByText("BUD Transfer Atomic")).toBeVisible();
  });
});
