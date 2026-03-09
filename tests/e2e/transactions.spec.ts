import { test, expect } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

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
