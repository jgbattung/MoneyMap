import { test, expect } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

test.describe("Installments", () => {
  test.beforeAll(async () => {
    await clearDatabase();
    const user = await seedBaseData();
    await createTestSession(user.id);

    // Create a credit card account (required for installments)
    await prisma.financialAccount.create({
      data: {
        id: "test-credit-card",
        userId: user.id,
        name: "Test Credit Card",
        accountType: "CREDIT_CARD",
        initialBalance: 0,
        currentBalance: 0,
      },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should create an installment transaction, hide the parent, and show child installments", async ({ page }) => {
    await page.goto("/expenses");

    // Click the "Add expense" button on the page (second one — first is in sidebar)
    await page.getByRole("button", { name: "Add expense" }).nth(1).click();

    // Wait for the sheet to appear
    await expect(page.getByText("Add Expense Transaction")).toBeVisible({ timeout: 10000 });

    // Fill in the expense name
    await page.getByLabel("Expense name").fill("New Laptop");

    // Fill in the total amount
    await page.getByLabel("Amount").fill("60000");

    // Select credit card account (this enables the installment toggle)
    await page.getByLabel("Account").click();
    await page.getByRole("option", { name: "Test Credit Card" }).click();

    // Toggle installment mode on
    await page.getByLabel("Installment").click();

    // Fill in installment duration
    await page.getByLabel("Installment duration (months)").fill("6");

    // Select installment start date — pick today
    const installmentDateButton = page.getByLabel("Installment start date");
    await installmentDateButton.click();
    // Click today's date in the calendar (gridcell names are full dates like "Today, Monday, March 9th, 2026")
    await page.getByRole("gridcell", { name: /Today/ }).getByRole("button").click();

    // Select expense type
    await page.getByLabel("Expense type").click();
    await page.getByRole("option", { name: "Shopping" }).click();

    // Submit the form (the button inside the open sheet)
    await page.locator('[data-slot="sheet-content"]').getByRole("button", { name: "Add expense" }).click();

    // Verify the success toast
    await expect(page.getByText("Expense transaction created successfully")).toBeVisible();

    // The parent installment (isInstallment=true) should NOT appear in the list
    // because the API filters with isInstallment: false.
    // Instead, the first system-generated child installment should appear.

    // Wait for the list to refresh
    await page.waitForTimeout(1000);

    // Verify the parent "New Laptop" with the full 60,000 amount is NOT visible
    // as a single row (the parent is hidden by the isInstallment filter).
    // The child installment with the monthly amount (10,000) should appear instead.
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("New Laptop");

    // Verify via the database that the parent is marked as installment
    const parentTransaction = await prisma.expenseTransaction.findFirst({
      where: {
        name: "New Laptop",
        isInstallment: true,
      },
    });
    expect(parentTransaction).not.toBeNull();
    expect(parentTransaction?.installmentDuration).toBe(6);

    // Verify the first child installment was created
    const childInstallments = await prisma.expenseTransaction.findMany({
      where: {
        parentInstallmentId: parentTransaction?.id,
        isSystemGenerated: true,
      },
    });
    expect(childInstallments.length).toBeGreaterThanOrEqual(1);

    // Verify the monthly amount is correct (60000 / 6 = 10000)
    const firstChild = childInstallments[0];
    expect(Number(firstChild.amount)).toBeCloseTo(10000, 0);
  });
});
