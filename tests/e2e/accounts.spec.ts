import { test, expect } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

test.describe("Accounts", () => {
  test.beforeAll(async () => {
    await clearDatabase();
    await seedBaseData();
    await createTestSession("test-user-id");
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should create a new checking account and display it in the list", async ({ page }) => {
    await page.goto("/accounts");

    // Page should load with the accounts heading
    await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible();

    // Click the "Add account" button (desktop version)
    await page.getByRole("button", { name: "Add account" }).first().click();

    // Wait for the sheet/dialog to appear
    await expect(page.getByText("Create account").first()).toBeVisible();

    // Fill in the account name
    await page.getByLabel("Account name").fill("Test Checking Account");

    // Select account type
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Checking" }).click();

    // Fill in the initial balance
    await page.getByLabel("Initial balance").fill("5000");

    // Submit the form
    await page.getByRole("button", { name: "Create account" }).click();

    // Verify the success toast appears
    await expect(page.getByText("Account created successfully")).toBeVisible();

    // Verify the new account appears in the list
    await expect(page.getByText("Test Checking Account")).toBeVisible();
    await expect(page.getByText("Checking")).toBeVisible();
  });
});
