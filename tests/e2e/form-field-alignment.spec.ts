import { test, expect, type Locator, type Page } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

// Layout regression for side-by-side form fields: when only one field of a row shows a
// validation error, both labels and both controls must stay on the same line. happy-dom
// has no layout engine, so this is measured with real bounding boxes in Chromium.
//
// Each test also strips the fix from the live DOM (FormItem `content-start`, or the row's
// `items-start`) and asserts the drift comes back, so a green run proves the scenario
// really produced an uneven row and the fix is what keeps it aligned.

const USER_ID = "test-user-id";
const TRANSFER_TYPE_ID = "transfer-type-internal";
const DESKTOP = { width: 1280, height: 900 };
const SM_TABLET = { width: 700, height: 1000 }; // sm two-column grid, but below md, so drawers open
const MOBILE = { width: 390, height: 844 };
const TOLERANCE = 0.5; // px

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  expect(b, "element should be laid out").not.toBeNull();
  return b!;
}

// Reads both tops in one frame, so a sheet or drawer that is still moving cannot skew it.
async function topDrift(a: Locator, b: Locator) {
  const handleB = await b.elementHandle();
  return a.evaluate(
    (elA, elB) => Math.abs(elA.getBoundingClientRect().top - elB!.getBoundingClientRect().top),
    handleB
  );
}

async function expectSameTop(a: Locator, b: Locator) {
  expect(await topDrift(a, b)).toBeLessThanOrEqual(TOLERANCE);
}

// Waits for the sheet/drawer slide-in (CSS transitions and animations) to finish.
async function settle(dialog: Locator) {
  await dialog.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished))
  );
}

// Removes `content-start` from every FormItem in the open dialog (undoes form.tsx).
async function stripContentStart(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('[role="dialog"] [data-slot="form-item"]')
      .forEach((el) => el.classList.remove("content-start"));
  });
}

// Restores the pre-fix `items-center` on the row that holds the given control.
async function restoreItemsCenter(control: Locator) {
  await control.evaluate((el) => {
    const row = el.closest('[data-slot="form-item"]')!.parentElement!;
    row.classList.replace("items-start", "items-center");
  });
}

async function pickOption(page: Page, trigger: Locator, name: string) {
  await trigger.click();
  await page.getByRole("option", { name, exact: true }).click();
  await expect(trigger).toContainText(name);
}

async function openNewPlan(page: Page) {
  await page.goto("/pay-division");
  await page.getByRole("tab", { name: "Plans" }).click();
  // "Create your first plan" while the list is empty, "New plan" once a plan exists.
  await page.getByRole("button", { name: /^(New plan|Create your first plan)$/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Plan name")).toBeVisible();
  await settle(dialog);
  return dialog;
}

function planRow(dialog: Locator) {
  return {
    nameLabel: dialog.locator("label", { hasText: /^Plan name$/ }),
    saveLabel: dialog.locator("label", { hasText: /^Save %$/ }),
    nameInput: dialog.getByLabel("Plan name"),
    saveInput: dialog.getByLabel("Save %"),
  };
}

async function expectPlanRowAligned(dialog: Locator) {
  const row = planRow(dialog);
  // Two-column layout: Save % sits to the right of Plan name.
  expect((await box(row.saveInput)).x).toBeGreaterThan((await box(row.nameInput)).x + 50);
  await expectSameTop(row.nameLabel, row.saveLabel);
  await expectSameTop(row.nameInput, row.saveInput);
}

function accountRow(dialog: Locator) {
  const from = dialog.getByLabel("From Account");
  return {
    from,
    to: dialog.getByLabel("To Account"),
    fromLabel: dialog.locator("label", { hasText: /^From Account$/ }),
    toLabel: dialog.locator("label", { hasText: /^To Account$/ }),
    arrow: from.locator('xpath=ancestor::*[@data-slot="form-item"]/following-sibling::*[1]'),
  };
}

async function expectAccountRowAligned(dialog: Locator) {
  const row = accountRow(dialog);
  await expectSameTop(row.fromLabel, row.toLabel);
  await expectSameTop(row.from, row.to);
  // The arrow is centred on the select triggers.
  const fromHandle = await row.from.elementHandle();
  const offset = await row.arrow.evaluate((arrow, from) => {
    const [a, f] = [arrow.getBoundingClientRect(), from!.getBoundingClientRect()];
    return Math.abs(a.top + a.height / 2 - (f.top + f.height / 2));
  }, fromHandle);
  expect(offset).toBeLessThanOrEqual(1);
}

test.describe.serial("Side-by-side form fields stay aligned when one shows an error", () => {
  test.beforeAll(async ({ request }) => {
    await clearDatabase();
    await seedBaseData();
    await createTestSession(USER_ID);

    for (const name of ["Align From", "Align To"]) {
      const res = await request.post("/api/accounts", {
        data: { name, accountType: "SAVINGS", initialBalance: "1000", addToNetWorth: true },
      });
      expect(res.ok(), await res.text()).toBeTruthy();
    }
    const [from, to] = await Promise.all(
      ["Align From", "Align To"].map((name) => prisma.financialAccount.findFirstOrThrow({ where: { name } }))
    );
    const transfer = await request.post("/api/transfer-transactions", {
      data: {
        name: "Align transfer",
        amount: "100",
        fromAccountId: from.id,
        toAccountId: to.id,
        transferTypeId: TRANSFER_TYPE_ID,
        date: "2026-11-01",
      },
    });
    expect(transfer.ok(), await transfer.text()).toBeTruthy();
  });

  test.afterAll(async () => {
    // Leave the same baseline the global setup creates, for the specs that follow.
    await clearDatabase();
    await seedBaseData();
    await createTestSession(USER_ID);
    await prisma.$disconnect();
  });

  for (const [label, viewport] of [
    ["Sheet (desktop)", DESKTOP],
    ["Drawer (sm tablet)", SM_TABLET],
  ] as const) {
    test(`Pay Plan ${label}: only Plan name shows an error`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const dialog = await openNewPlan(page);
      const row = planRow(dialog);

      await row.nameInput.focus();
      await row.nameInput.blur();
      await expect(dialog.getByText("Plan name is required")).toBeVisible();
      await expect(dialog.getByText("Save percent must be between 0 and 100")).toHaveCount(0);

      await expectPlanRowAligned(dialog);
      // The error renders below its own input.
      expect((await box(dialog.getByText("Plan name is required"))).y).toBeGreaterThan(
        (await box(row.nameInput)).y + (await box(row.nameInput)).height - TOLERANCE
      );

      await stripContentStart(page);
      expect(await topDrift(row.nameInput, row.saveInput)).toBeGreaterThan(2);
    });

    test(`Pay Plan ${label}: only Save % shows an error`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const dialog = await openNewPlan(page);
      const row = planRow(dialog);

      // Plan name is autofocused on open, so leaving it touches it: give it a valid value.
      await row.nameInput.fill("Valid name");
      await row.saveInput.fill("150");
      await row.saveInput.blur();
      await expect(dialog.getByText("Save percent must be between 0 and 100")).toBeVisible();
      await expect(dialog.getByText("Plan name is required")).toHaveCount(0);

      await expectPlanRowAligned(dialog);

      await stripContentStart(page);
      expect(await topDrift(row.nameInput, row.saveInput)).toBeGreaterThan(2);
    });
  }

  test("Pay Plan edit: clearing only Plan name keeps the row aligned", async ({ page, request }) => {
    const [from, to] = await Promise.all(
      ["Align From", "Align To"].map((name) => prisma.financialAccount.findFirstOrThrow({ where: { name } }))
    );
    const res = await request.post("/api/pay-plans", {
      data: {
        name: "Align plan",
        savePercent: "30",
        sourceAccountId: from.id,
        saveAccountId: to.id,
        spendAccountId: from.id,
        transferTypeId: TRANSFER_TYPE_ID,
        lines: [{ name: "EF", kind: "PERCENT", value: "100" }],
      },
    });
    expect(res.status(), await res.text()).toBe(201);

    await page.setViewportSize(DESKTOP);
    await page.goto("/pay-division");
    await page.getByRole("tab", { name: "Plans" }).click();
    await page.getByRole("button", { name: /Align plan/ }).click();
    const dialog = page.getByRole("dialog");
    const row = planRow(dialog);
    await expect(row.nameInput).toHaveValue("Align plan");
    await settle(dialog);

    await row.nameInput.fill("");
    await row.nameInput.blur();
    await expect(dialog.getByText("Plan name is required")).toBeVisible();
    await expectPlanRowAligned(dialog);
  });

  async function openCreateTransferSheet(page: Page) {
    await page.setViewportSize(DESKTOP);
    await page.goto("/transfers");
    await page.getByRole("button", { name: "Add transfer" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("From Account")).toBeVisible();
    await settle(dialog);
    return dialog;
  }

  async function openCreateTransferDrawer(page: Page) {
    await page.setViewportSize(MOBILE);
    await page.goto("/transfers");
    // Floating action button: open it, then the transfer action (no accessible names).
    await page.locator("button.bg-primary-600.rounded-full").click();
    await page.locator("button.bg-secondary-500.rounded-full").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("From Account")).toBeVisible();
    await settle(dialog);
    return dialog;
  }

  for (const [label, open] of [
    ["Create Transfer Sheet", openCreateTransferSheet],
    ["Create Transfer Drawer", openCreateTransferDrawer],
  ] as const) {
    test(`${label}: only To Account shows an error`, async ({ page }) => {
      const dialog = await open(page);
      const row = accountRow(dialog);

      await expectAccountRowAligned(dialog);

      await pickOption(page, row.from, "Align From");
      await dialog.locator('button[type="submit"]').click();
      await expect(dialog.getByText("To account is required")).toBeVisible();
      await expect(dialog.getByText("From account is required")).toHaveCount(0);

      await expectAccountRowAligned(dialog);

      await restoreItemsCenter(row.from);
      expect(await topDrift(row.from, row.to)).toBeGreaterThan(2);
    });

    test(`${label}: only From Account shows an error`, async ({ page }) => {
      const dialog = await open(page);
      const row = accountRow(dialog);

      await pickOption(page, row.to, "Align To");
      await dialog.locator('button[type="submit"]').click();
      await expect(dialog.getByText("From account is required")).toBeVisible();
      await expect(dialog.getByText("To account is required")).toHaveCount(0);

      await expectAccountRowAligned(dialog);

      await restoreItemsCenter(row.from);
      expect(await topDrift(row.from, row.to)).toBeGreaterThan(2);
    });
  }

  test("Edit Transfer Drawer: From/To row is aligned with the arrow centred", async ({ page }) => {
    // Both accounts are prefilled and valid, so no single-sided error can be produced here;
    // the row markup is identical to the create forms. This guards the no-error state.
    await page.setViewportSize(MOBILE);
    await page.goto("/transfers");
    await page.getByText("Align transfer").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("From Account")).toContainText("Align From");
    await settle(dialog);

    await expectAccountRowAligned(dialog);
  });
});
