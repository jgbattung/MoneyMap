import { test, expect, type APIRequestContext } from "@playwright/test";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

// Runs against the real local E2E database (localhost:5433/money_map_dev, enforced by
// playwright/utils/db-guard.ts). Proves the database-level behaviour that the mocked
// route tests cannot: the atomic tick and its double-submit guard, untick via the
// existing transfer DELETE (FK SET NULL), snapshots surviving plan edits and deletes,
// and checklist deletes keeping recorded transfers.

const USER_ID = "test-user-id";
const TRANSFER_TYPE_ID = "transfer-type-internal";

const JUN_LINES = [
  { name: "EF", kind: "PERCENT", value: "50" },
  { name: "Gotrade", kind: "PERCENT", value: "17.5" },
  { name: "MP2", kind: "PERCENT", value: "17.5" },
  { name: "Sinking", kind: "PERCENT", value: "15" },
  { name: "Papa TW", kind: "FIXED", value: "1000", from: "SPEND" },
];

async function createAccount(request: APIRequestContext, name: string, accountType: string, initialBalance: string) {
  const res = await request.post("/api/accounts", {
    data: { name, accountType, initialBalance, addToNetWorth: true },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).id as string;
}

async function createPlan(request: APIRequestContext, data: Record<string, unknown>) {
  const res = await request.post("/api/pay-plans", { data });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).id as string;
}

async function balance(id: string) {
  const row = await prisma.financialAccount.findUniqueOrThrow({ where: { id } });
  return row.currentBalance.toString();
}

async function itemsOf(divisionId: string) {
  return prisma.payDivisionItem.findMany({ where: { divisionId }, orderBy: { sortOrder: "asc" } });
}

test.describe.serial("Pay Division against the real database", () => {
  let srcId = "";
  let savId = "";
  let spdId = "";
  let incomeId = "";
  let planId = "";
  let divisionId = "";
  let savingsItemId = "";
  let spendingItemId = "";
  let efItemId = "";

  test.beforeAll(async () => {
    await clearDatabase();
    await seedBaseData();
    await createTestSession(USER_ID);
  });

  test.afterAll(async () => {
    // Leave the same baseline the global setup creates, for the specs that follow.
    await clearDatabase();
    await seedBaseData();
    await createTestSession(USER_ID);
    await prisma.$disconnect();
  });

  test("creates a plan and a division linked to an income, with server-computed amounts", async ({ request }) => {
    srcId = await createAccount(request, "GoTyme", "SAVINGS", "0");
    savId = await createAccount(request, "Tonik", "SAVINGS", "0");
    spdId = await createAccount(request, "BPI", "CHECKING", "0");

    const income = await request.post("/api/income-transactions", {
      data: { name: "Pay", amount: "34495.53", accountId: srcId, incomeTypeId: "income-type-salary", date: "2026-06-15" },
    });
    expect(income.ok(), await income.text()).toBeTruthy();
    incomeId = (await income.json()).id;
    expect(await balance(srcId)).toBe("34495.53");

    planId = await createPlan(request, {
      name: "Jun 15 plan",
      savePercent: "30",
      sourceAccountId: srcId,
      saveAccountId: savId,
      spendAccountId: spdId,
      transferTypeId: TRANSFER_TYPE_ID,
      lines: JUN_LINES,
    });

    // Tampered client amounts are ignored.
    const res = await request.post("/api/pay-divisions", {
      data: { planId, payAmount: "34495.53", payDate: "2026-06-15", incomeTransactionId: incomeId, saveAmount: "1.00" },
    });
    expect(res.status(), await res.text()).toBe(201);
    divisionId = (await res.json()).id;

    const division = await prisma.payDivision.findUniqueOrThrow({ where: { id: divisionId } });
    expect(division.userId).toBe(USER_ID);
    expect(division.saveAmount.toString()).toBe("10348.66");
    expect(division.spendAmount.toString()).toBe("23146.87");
    expect(division.payDate.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(division.incomeTransactionId).toBe(incomeId);

    const items = await itemsOf(divisionId);
    const savings = items.find((i) => i.label === "Savings")!;
    const spending = items.find((i) => i.label === "Spending")!;
    savingsItemId = savings.id;
    spendingItemId = spending.id;
    efItemId = items.find((i) => i.label === "EF")!.id;

    expect(savings).toMatchObject({ kind: "TRANSFER", fromAccountId: srcId, toAccountId: savId, transferTypeId: TRANSFER_TYPE_ID });
    expect(savings.amount.toString()).toBe("11348.66");
    expect(spending.amount.toString()).toBe("23146.87");
    const children = items.filter((i) => i.parentItemId === savings.id);
    expect(Object.fromEntries(children.map((c) => [c.label, c.amount.toString()]))).toEqual({
      EF: "5174.33",
      Gotrade: "1811.02",
      MP2: "1811.01",
      Sinking: "1552.3",
      "Papa TW": "1000",
    });
    expect(children.every((c) => c.kind === "EARMARK" && c.transferTypeId === null)).toBe(true);
    // No balance moves when a checklist is started.
    expect(await balance(srcId)).toBe("34495.53");
  });

  test("a second division for the same income is rejected with 409 and creates nothing", async ({ request }) => {
    const res = await request.post("/api/pay-divisions", {
      data: { planId, payAmount: "34495.53", payDate: "2026-06-15", incomeTransactionId: incomeId },
    });
    expect(res.status()).toBe(409);
    expect(await prisma.payDivision.count()).toBe(1);
    expect(await prisma.payDivisionItem.count()).toBe(7);
  });

  test("ticking a transfer row records the transfer, both balances and the link at once", async ({ request }) => {
    const res = await request.post(`/api/pay-divisions/${divisionId}/items/${savingsItemId}/transfer`, {
      data: { amount: "11348.66", date: "2026-06-16" },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = await res.json();
    expect(body.transferTransactionId).toBeTruthy();

    const transfer = await prisma.transferTransaction.findUniqueOrThrow({ where: { id: body.transferTransactionId } });
    expect(transfer).toMatchObject({
      userId: USER_ID,
      name: "Pay division: Savings",
      fromAccountId: srcId,
      toAccountId: savId,
      transferTypeId: TRANSFER_TYPE_ID,
      amount: 11348.66,
    });
    expect(transfer.date.toISOString()).toBe("2026-06-16T00:00:00.000Z");
    expect(await balance(srcId)).toBe("23146.87");
    expect(await balance(savId)).toBe("11348.66");
  });

  test("a second confirm on the same row is 409 and changes nothing", async ({ request }) => {
    const res = await request.post(`/api/pay-divisions/${divisionId}/items/${savingsItemId}/transfer`, {
      data: { amount: "11348.66", date: "2026-06-16" },
    });
    expect(res.status()).toBe(409);
    expect(await prisma.transferTransaction.count()).toBe(1);
    expect(await balance(srcId)).toBe("23146.87");
    expect(await balance(savId)).toBe("11348.66");
  });

  test("the guarded update throws P2025 on a linked row and rolls back the whole batch", async () => {
    // Same where shape the route uses; proves the extra filter on a unique where is enforced by Postgres.
    const attempt = prisma.$transaction([
      prisma.payDivisionItem.update({
        where: { id: savingsItemId, AND: [{ transferTransactionId: null }] },
        data: { completedAt: new Date() },
      }),
      prisma.financialAccount.update({ where: { id: srcId }, data: { currentBalance: { decrement: 1 } } }),
    ]);
    await expect(attempt).rejects.toMatchObject({ code: "P2025" });
    expect(await balance(srcId)).toBe("23146.87");
    expect((await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: savingsItemId } })).completedAt).toBeNull();
  });

  test("two concurrent ticks on one row record exactly one transfer", async ({ request }) => {
    const send = () =>
      request.post(`/api/pay-divisions/${divisionId}/items/${spendingItemId}/transfer`, {
        data: { amount: "23000", date: "2026-06-17" },
      });
    const statuses = (await Promise.all([send(), send()])).map((r) => r.status()).sort();
    expect(statuses).toEqual([201, 409]);
    expect(await prisma.transferTransaction.count({ where: { toAccountId: spdId } })).toBe(1);
    // The edited amount is used, not the planned 23146.87.
    expect(await balance(spdId)).toBe("23000");
    expect(await balance(srcId)).toBe("146.87");
  });

  test("earmark rows tick and untick with no balance effect, and transfer rows cannot be toggled", async ({ request }) => {
    const before = [await balance(srcId), await balance(savId), await balance(spdId)];

    const tick = await request.patch(`/api/pay-divisions/${divisionId}/items/${efItemId}`, { data: { done: true } });
    expect(tick.status()).toBe(200);
    expect((await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: efItemId } })).completedAt).not.toBeNull();

    const untick = await request.patch(`/api/pay-divisions/${divisionId}/items/${efItemId}`, { data: { done: false } });
    expect(untick.status()).toBe(200);
    expect((await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: efItemId } })).completedAt).toBeNull();

    const wrongKind = await request.patch(`/api/pay-divisions/${divisionId}/items/${savingsItemId}`, { data: { done: false } });
    expect(wrongKind.status()).toBe(400);
    expect((await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: savingsItemId } })).transferTransactionId).not.toBeNull();

    expect([await balance(srcId), await balance(savId), await balance(spdId)]).toEqual(before);
  });

  test("unticking deletes the transfer through the existing route, restores balances and unticks the row", async ({ request }) => {
    const item = await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: spendingItemId } });
    const res = await request.delete(`/api/transfer-transactions/${item.transferTransactionId}`);
    expect(res.ok(), await res.text()).toBeTruthy();

    expect((await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: spendingItemId } })).transferTransactionId).toBeNull();
    expect(await balance(spdId)).toBe("0");
    expect(await balance(srcId)).toBe("23146.87");

    // The GET shows it unticked; the Savings row is still linked.
    const list = await (await request.get("/api/pay-divisions")).json();
    const rows = list[0].items as Array<{ id: string; transferTransactionId: string | null; transferTransaction: unknown }>;
    expect(rows.find((r) => r.id === spendingItemId)).toMatchObject({ transferTransactionId: null, transferTransaction: null });
    expect(rows.find((r) => r.id === savingsItemId)!.transferTransactionId).not.toBeNull();
  });

  test("editing and then deleting the plan leaves the checklist snapshot unchanged", async ({ request }) => {
    const before = await itemsOf(divisionId);

    const edit = await request.patch(`/api/pay-plans/${planId}`, {
      data: {
        name: "Renamed plan",
        savePercent: "40",
        sourceAccountId: srcId,
        saveAccountId: savId,
        spendAccountId: spdId,
        transferTypeId: TRANSFER_TYPE_ID,
        lines: [{ name: "Only", kind: "PERCENT", value: "100" }],
      },
    });
    expect(edit.status(), await edit.text()).toBe(200);

    let division = await prisma.payDivision.findUniqueOrThrow({ where: { id: divisionId } });
    expect(division.planName).toBe("Jun 15 plan");
    expect(division.savePercent.toString()).toBe("30");
    expect(division.saveAmount.toString()).toBe("10348.66");
    expect(await itemsOf(divisionId)).toEqual(before);

    const del = await request.delete(`/api/pay-plans/${planId}`);
    expect(del.status()).toBe(200);
    division = await prisma.payDivision.findUniqueOrThrow({ where: { id: divisionId } });
    expect(division.planId).toBeNull();
    expect(division.planName).toBe("Jun 15 plan");
    expect(await itemsOf(divisionId)).toEqual(before);
  });

  test("deleting a checklist keeps the transfers it recorded and the balances", async ({ request }) => {
    const savings = await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: savingsItemId } });
    const balancesBefore = [await balance(srcId), await balance(savId)];

    const res = await request.delete(`/api/pay-divisions/${divisionId}`);
    expect(res.status()).toBe(200);

    expect(await prisma.payDivision.findUnique({ where: { id: divisionId } })).toBeNull();
    expect(await prisma.payDivisionItem.count({ where: { divisionId } })).toBe(0);
    expect(await prisma.transferTransaction.findUnique({ where: { id: savings.transferTransactionId! } })).not.toBeNull();
    expect([await balance(srcId), await balance(savId)]).toEqual(balancesBefore);
    // The income can be divided again once its checklist is gone.
    const again = await request.post("/api/pay-divisions", {
      data: { planId: await createPlan(request, {
        name: "Again", savePercent: "0", sourceAccountId: srcId, saveAccountId: srcId,
        spendAccountId: spdId, transferTypeId: TRANSFER_TYPE_ID, lines: [],
      }), payAmount: "100", payDate: "2026-06-15", incomeTransactionId: incomeId },
    });
    expect(again.status(), await again.text()).toBe(201);
  });

  test("a plan whose account was deleted is incomplete and cannot start a checklist", async ({ request }) => {
    const tempId = await createAccount(request, "Temp wallet", "CASH", "0");
    const brokenId = await createPlan(request, {
      name: "Broken plan", savePercent: "30", sourceAccountId: srcId, saveAccountId: savId,
      spendAccountId: tempId, transferTypeId: TRANSFER_TYPE_ID, lines: [{ name: "EF", kind: "PERCENT", value: "100" }],
    });

    const del = await request.delete(`/api/accounts/${tempId}`);
    expect(del.status(), await del.text()).toBe(200);

    const plans = await (await request.get("/api/pay-plans")).json();
    const broken = plans.find((p: { id: string }) => p.id === brokenId);
    expect(broken).toMatchObject({ spendAccountId: null, spendAccount: null });

    const res = await request.post("/api/pay-divisions", {
      data: { planId: brokenId, payAmount: "1000", payDate: "2026-06-30" },
    });
    expect(res.status()).toBe(400);
    expect(await prisma.payDivision.count({ where: { planId: brokenId } })).toBe(0);
  });

  test("when the save account is the source, lines are top-level earmarks and only Spending is a transfer", async ({ request }) => {
    const sameId = await createPlan(request, {
      name: "Stash plan", savePercent: "30", sourceAccountId: srcId, saveAccountId: srcId,
      spendAccountId: spdId, transferTypeId: TRANSFER_TYPE_ID,
      lines: [
        { name: "Stash A", kind: "PERCENT", value: "60" },
        { name: "Stash B", kind: "PERCENT", value: "40" },
      ],
    });
    const res = await request.post("/api/pay-divisions", {
      data: { planId: sameId, payAmount: "1000", payDate: "2026-06-30" },
    });
    expect(res.status(), await res.text()).toBe(201);
    const items = await itemsOf((await res.json()).id);
    expect(items.map((i) => [i.kind, i.label, i.amount.toString(), i.parentItemId])).toEqual([
      ["EARMARK", "Stash A", "180", null],
      ["EARMARK", "Stash B", "120", null],
      ["TRANSFER", "Spending", "700", null],
    ]);
  });

  test("another user's division, items and plans are not reachable", async ({ request }) => {
    const now = new Date();
    await prisma.user.create({
      data: { id: "other-user-id", name: "Other", email: "other@moneymap.dev", emailVerified: true, createdAt: now, updatedAt: now },
    });
    const a = await prisma.financialAccount.create({
      data: { userId: "other-user-id", name: "Other A", accountType: "SAVINGS", initialBalance: 500, currentBalance: 500 },
    });
    const b = await prisma.financialAccount.create({
      data: { userId: "other-user-id", name: "Other B", accountType: "SAVINGS", initialBalance: 0, currentBalance: 0 },
    });
    const type = await prisma.transferType.create({ data: { userId: "other-user-id", name: "Other type" } });
    await prisma.payPlan.create({
      data: { userId: "other-user-id", name: "Other plan", savePercent: 0, lines: [] },
    });
    const division = await prisma.payDivision.create({
      data: {
        userId: "other-user-id", planName: "Other plan", savePercent: 0, payAmount: 500,
        saveAmount: 0, spendAmount: 500, payDate: new Date("2026-06-30"),
        items: {
          create: [{
            kind: "TRANSFER", label: "Spending", amount: 500, sortOrder: 0,
            fromAccountId: a.id, toAccountId: b.id, transferTypeId: type.id,
          }, {
            kind: "EARMARK", label: "Other bucket", amount: 1, sortOrder: 1,
          }],
        },
      },
      include: { items: true },
    });
    const [transferItem, earmark] = division.items.sort((x, y) => x.sortOrder - y.sortOrder);

    const tick = await request.post(`/api/pay-divisions/${division.id}/items/${transferItem.id}/transfer`, {
      data: { amount: "500", date: "2026-06-30" },
    });
    expect(tick.status()).toBe(404);
    const toggle = await request.patch(`/api/pay-divisions/${division.id}/items/${earmark.id}`, { data: { done: true } });
    expect(toggle.status()).toBe(404);
    const del = await request.delete(`/api/pay-divisions/${division.id}`);
    expect(del.status()).toBe(404);

    const list = await (await request.get("/api/pay-divisions")).json();
    expect(list.some((d: { id: string }) => d.id === division.id)).toBe(false);
    const plans = await (await request.get("/api/pay-plans")).json();
    expect(plans.some((p: { name: string }) => p.name === "Other plan")).toBe(false);

    expect(await prisma.payDivision.findUnique({ where: { id: division.id } })).not.toBeNull();
    expect((await prisma.payDivisionItem.findUniqueOrThrow({ where: { id: earmark.id } })).completedAt).toBeNull();
    expect((await prisma.financialAccount.findUniqueOrThrow({ where: { id: a.id } })).currentBalance.toString()).toBe("500");
    expect(await prisma.transferTransaction.count({ where: { userId: "other-user-id" } })).toBe(0);
  });

  test("the page renders the checklist and ticking an earmark in the UI persists it", async ({ page }) => {
    await page.goto("/pay-division");
    await expect(page.getByRole("heading", { name: "Pay Division" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Pay Division" }).first()).toBeVisible();

    const card = page.getByRole("region", { name: "Stash plan division" });
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card.getByText(/0 of 3 done/)).toBeVisible();

    await card.getByRole("checkbox", { name: "Mark Stash A as done" }).click();
    await expect(card.getByText(/1 of 3 done/)).toBeVisible({ timeout: 15000 });
    const stashA = await prisma.payDivisionItem.findFirstOrThrow({ where: { label: "Stash A" } });
    expect(stashA.completedAt).not.toBeNull();

    // Ticking a transfer row opens the confirm dialog with the planned amount prefilled.
    await card.getByRole("checkbox", { name: "Mark Spending as done" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Record transfer")).toBeVisible();
    await expect(dialog.getByLabel("Amount")).toHaveValue("700");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
