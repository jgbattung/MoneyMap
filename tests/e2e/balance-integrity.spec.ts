import { test, expect } from "@playwright/test";
import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import { clearDatabase, seedBaseData, createTestSession, prisma } from "../../playwright/utils/db";

const SQL_DIR = path.resolve(__dirname, "../../scripts/db");
const readSql = (file: string) => fs.readFileSync(path.join(SQL_DIR, file), "utf-8");

const RECONCILE_SQL = readSql("reconcile-balances.sql");
const REPAIR_SQL = readSql("repair-balances.sql");
const UNDO_SQL = readSql("undo-balance-repair.sql");

type CheckRow = {
  id: string;
  name: string;
  initial_balance: Prisma.Decimal;
  stored_balance: Prisma.Decimal;
  expected_balance: Prisma.Decimal;
  diff: Prisma.Decimal;
};

// Runs the reconciliation file inside a READ ONLY transaction. If the file
// contained any write, Postgres would reject it and this helper would throw.
async function runCheck(): Promise<Record<string, CheckRow>> {
  const rows = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return tx.$queryRawUnsafe<CheckRow[]>(RECONCILE_SQL);
  });
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

// Replaces the placeholder row between the markers with the given rows.
function withAccounts(sql: string, rows: Array<[string, string]>): string {
  const list = rows.map(([id, diff]) => `('${id}', ${diff})`).join(",\n");
  const pattern = /\/\* ACCOUNTS START \*\/[\s\S]*?\/\* ACCOUNTS END \*\//;
  expect(sql).toMatch(pattern);
  return sql.replace(pattern, () => `/* ACCOUNTS START */\n${list}\n/* ACCOUNTS END */`);
}

async function balances(id: string) {
  const row = await prisma.financialAccount.findUniqueOrThrow({ where: { id } });
  return { initial: row.initialBalance.toString(), current: row.currentBalance.toString() };
}

function expectAllZero(check: Record<string, CheckRow>, ids: string[]) {
  for (const id of ids) {
    expect(check[id], `account ${id} missing from the check`).toBeDefined();
    expect(check[id].diff.isZero(), `diff for ${check[id].name} is ${check[id].diff}`).toBe(true);
  }
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

test.describe.serial("Balance integrity (MM-030 and MM-031)", () => {
  let checkingId = "";
  let savingsId = "";
  let cardId = "";
  let allIds: string[] = [];

  test.beforeAll(async () => {
    await clearDatabase();
    await seedBaseData();
    await createTestSession("test-user-id");
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("creates accounts, a card and real transactions through the API", async ({ request }) => {
    const today = isoDate(new Date());

    const checking = await request.post("/api/accounts", {
      data: { name: "Checking", accountType: "CHECKING", initialBalance: "10000", addToNetWorth: true },
    });
    expect(checking.ok(), await checking.text()).toBeTruthy();
    checkingId = (await checking.json()).id;

    const savings = await request.post("/api/accounts", {
      data: { name: "Savings", accountType: "SAVINGS", initialBalance: "5000", addToNetWorth: true },
    });
    expect(savings.ok(), await savings.text()).toBeTruthy();
    savingsId = (await savings.json()).id;

    const card = await request.post("/api/cards", {
      data: { name: "Visa", initialBalance: "-2000", statementDate: 5, dueDate: 25 },
    });
    expect(card.ok(), await card.text()).toBeTruthy();
    cardId = (await card.json()).id;

    allIds = [checkingId, savingsId, cardId];

    // Two expenses and one income on checking
    for (const [name, amount] of [["Groceries run", "1200.50"], ["Dinner", "799.25"]]) {
      const res = await request.post("/api/expense-transactions", {
        data: {
          name,
          amount,
          accountId: checkingId,
          expenseTypeId: "expense-type-groceries",
          date: today,
          isInstallment: false,
        },
      });
      expect(res.ok(), await res.text()).toBeTruthy();
    }

    const income = await request.post("/api/income-transactions", {
      data: { name: "Salary", amount: "3500", accountId: checkingId, incomeTypeId: "income-type-salary", date: today },
    });
    expect(income.ok(), await income.text()).toBeTruthy();

    // Transfer checking -> savings with a fee (the fee becomes an expense row)
    const transfer = await request.post("/api/transfer-transactions", {
      data: {
        name: "Move to savings",
        amount: "1000",
        fromAccountId: checkingId,
        toAccountId: savingsId,
        transferTypeId: "transfer-type-internal",
        date: today,
        feeAmount: "15.75",
      },
    });
    expect(transfer.ok(), await transfer.text()).toBeTruthy();

    // Installment on the card, started two months ago so a past-due child is created
    const start = new Date();
    start.setMonth(start.getMonth() - 2);
    const installment = await request.post("/api/expense-transactions", {
      data: {
        name: "Laptop",
        amount: "6000",
        accountId: cardId,
        expenseTypeId: "expense-type-shopping",
        date: isoDate(start),
        isInstallment: true,
        installmentDuration: 3,
        installmentStartDate: isoDate(start),
      },
    });
    expect(installment.ok(), await installment.text()).toBeTruthy();

    const children = await prisma.expenseTransaction.count({
      where: { accountId: cardId, isInstallment: false, isSystemGenerated: true },
    });
    expect(children).toBeGreaterThanOrEqual(1);
  });

  test("the check is read-only and reports 0 on API-created data", async () => {
    const check = await runCheck();
    expectAllZero(check, allIds);
  });

  test("renaming an account or card keeps the balance; opening-balance edits shift it", async ({ request }) => {
    // Account rename with the same opening balance
    const before = await balances(checkingId);
    const rename = await request.patch(`/api/accounts/${checkingId}`, {
      data: { name: "Checking Renamed", accountType: "CHECKING", initialBalance: "10000", addToNetWorth: true },
    });
    expect(rename.status()).toBe(200);
    const afterRename = await balances(checkingId);
    expect(afterRename.current).toBe(before.current);
    expect(afterRename.initial).toBe(before.initial);

    // Opening balance +500 shifts the live balance by exactly 500
    const raise = await request.patch(`/api/accounts/${checkingId}`, {
      data: { name: "Checking Renamed", accountType: "CHECKING", initialBalance: "10500", addToNetWorth: true },
    });
    expect(raise.status()).toBe(200);
    const afterRaise = await balances(checkingId);
    expect(new Prisma.Decimal(afterRaise.current).minus(before.current).toString()).toBe("500");
    expect(afterRaise.initial).toBe("10500");

    // Card name-only edit sends the stored opening balance back unchanged
    const cardBefore = await balances(cardId);
    const cardRename = await request.patch(`/api/cards/${cardId}`, {
      data: { name: "Visa Renamed", initialBalance: "-2000", statementDate: 5, dueDate: 25 },
    });
    expect(cardRename.status()).toBe(200);
    const cardAfterRename = await balances(cardId);
    expect(cardAfterRename.current).toBe(cardBefore.current);

    // Card opening balance -2000 -> -2500 moves the live balance by -500
    const cardChange = await request.patch(`/api/cards/${cardId}`, {
      data: { name: "Visa Renamed", initialBalance: "-2500", statementDate: 5, dueDate: 25 },
    });
    expect(cardChange.status()).toBe(200);
    const cardAfterChange = await balances(cardId);
    expect(new Prisma.Decimal(cardAfterChange.current).minus(cardBefore.current).toString()).toBe("-500");

    // A missing account is a 404, not a 500
    const missing = await request.patch("/api/accounts/does-not-exist", {
      data: { name: "x", accountType: "CHECKING", initialBalance: "1", addToNetWorth: true },
    });
    expect(missing.status()).toBe(404);

    // History still agrees with every balance
    expectAllZero(await runCheck(), allIds);
  });

  test("a corrupted account is detected and no other account is affected", async () => {
    // Simulate the old bug: the balance was reset to the opening balance
    const savings = await prisma.financialAccount.findUniqueOrThrow({ where: { id: savingsId } });
    await prisma.financialAccount.update({
      where: { id: savingsId },
      data: { currentBalance: savings.initialBalance },
    });

    const check = await runCheck();
    expect(check[savingsId].diff.toString()).toBe("-1000");
    expectAllZero(check, [checkingId, cardId]);
  });

  test("the repair rolls back entirely when any row fails", async () => {
    const before = await balances(savingsId);
    const sql = withAccounts(REPAIR_SQL, [
      [savingsId, "-1000.00"],
      ["does-not-exist", "5.00"],
    ]);

    await expect(prisma.$executeRawUnsafe(sql)).rejects.toThrow(/was not found/);
    expect(await balances(savingsId)).toEqual(before);
  });

  test("the shipped placeholder fails safely when run unedited", async () => {
    const before = await balances(savingsId);
    await expect(prisma.$executeRawUnsafe(REPAIR_SQL)).rejects.toThrow(/was not found/);
    await expect(prisma.$executeRawUnsafe(UNDO_SQL)).rejects.toThrow(/was not found/);
    expect(await balances(savingsId)).toEqual(before);
  });

  test("the repair moves the diff into initial_balance and never touches current_balance", async () => {
    const before = await balances(savingsId);
    const check = await runCheck();
    const diff = check[savingsId].diff.toString();

    await prisma.$executeRawUnsafe(withAccounts(REPAIR_SQL, [[savingsId, diff]]));

    const after = await balances(savingsId);
    expect(after.current).toBe(before.current);
    expect(new Prisma.Decimal(after.initial).minus(before.initial).toString()).toBe(diff);
    expectAllZero(await runCheck(), allIds);
  });

  test("a stale diff is rejected and the database is unchanged", async () => {
    const before = await balances(savingsId);

    await expect(
      prisma.$executeRawUnsafe(withAccounts(REPAIR_SQL, [[savingsId, "-1000.00"]]))
    ).rejects.toThrow(/live diff/);

    expect(await balances(savingsId)).toEqual(before);
  });

  test("the undo restores the original initial_balance exactly", async () => {
    const repaired = await balances(savingsId);

    await prisma.$executeRawUnsafe(withAccounts(UNDO_SQL, [[savingsId, "-1000.00"]]));

    const restored = await balances(savingsId);
    expect(restored.current).toBe(repaired.current);
    expect(restored.initial).toBe("5000");

    const check = await runCheck();
    expect(check[savingsId].diff.toString()).toBe("-1000");
    expectAllZero(check, [checkingId, cardId]);
  });

  // QA remediation: real-Postgres concurrency, multi-row repair, undo guards

  // Shifts current_balance directly, bypassing the API, to simulate the old bug.
  async function corrupt(id: string, delta: string) {
    const row = await prisma.financialAccount.findUniqueOrThrow({ where: { id } });
    await prisma.financialAccount.update({
      where: { id },
      data: { currentBalance: row.currentBalance.plus(delta) },
    });
    return row.currentBalance.toString();
  }

  async function setCurrent(id: string, value: string) {
    await prisma.financialAccount.update({ where: { id }, data: { currentBalance: new Prisma.Decimal(value) } });
  }

  test("reset: heal the savings account left corrupted by the previous test", async () => {
    const check = await runCheck();
    await setCurrent(savingsId, check[savingsId].expected_balance.toString());
    expectAllZero(await runCheck(), allIds);
  });

  test("the conditional update rejects a stale opening balance on real Postgres", async ({ request }) => {
    const stored = (await prisma.financialAccount.findUniqueOrThrow({ where: { id: checkingId } })).initialBalance;

    const change = await request.patch(`/api/accounts/${checkingId}`, {
      data: { name: "Checking Renamed", accountType: "CHECKING", initialBalance: stored.plus(100).toString(), addToNetWorth: true },
    });
    expect(change.status()).toBe(200);

    const before = await balances(checkingId);
    let code: string | undefined;
    try {
      await prisma.financialAccount.update({
        where: { id: checkingId, userId: "test-user-id", initialBalance: stored },
        data: { name: "should-not-apply" },
      });
    } catch (e) {
      code = (e as { code?: string }).code;
    }
    expect(code).toBe("P2025");

    const row = await prisma.financialAccount.findUniqueOrThrow({ where: { id: checkingId } });
    expect(row.name).toBe("Checking Renamed");
    expect(await balances(checkingId)).toEqual(before);
    expectAllZero(await runCheck(), allIds);
  });

  test("five concurrent opening-balance edits never corrupt the balance", async ({ request }) => {
    const base = (await prisma.financialAccount.findUniqueOrThrow({ where: { id: checkingId } })).initialBalance;
    const values = [1, 2, 3, 4, 5].map((n) => base.plus(n * 111).toString());

    const responses = await Promise.all(
      values.map((initialBalance) =>
        request.patch(`/api/accounts/${checkingId}`, {
          data: { name: "Checking Renamed", accountType: "CHECKING", initialBalance, addToNetWorth: true },
        })
      )
    );

    const statuses = responses.map((r) => r.status());
    for (const status of statuses) expect([200, 409]).toContain(status);
    expect(statuses.filter((st) => st === 200).length).toBeGreaterThanOrEqual(1);

    const won = new Set<string>();
    for (const r of responses) {
      if (r.status() === 200) won.add(new Prisma.Decimal((await r.json()).initialBalance).toString());
    }

    const row = await prisma.financialAccount.findUniqueOrThrow({ where: { id: checkingId } });
    expect(won.has(row.initialBalance.toString()), `stored ${row.initialBalance} is not one of ${[...won]}`).toBe(true);
    expectAllZero(await runCheck(), allIds);
  });

  test("a multi-row repair including a card works, then the undo restores both exactly", async () => {
    const originals = {
      [checkingId]: await corrupt(checkingId, "250"),
      [cardId]: await corrupt(cardId, "-400"),
    };

    try {
      const check = await runCheck();
      expect(check[checkingId].diff.toString()).toBe("250");
      expect(check[cardId].diff.toString()).toBe("-400");
      expectAllZero(check, [savingsId]);

      const rows: Array<[string, string]> = [
        [checkingId, check[checkingId].diff.toString()],
        [cardId, check[cardId].diff.toString()],
      ];
      const beforeChecking = await balances(checkingId);
      const beforeCard = await balances(cardId);

      await prisma.$executeRawUnsafe(withAccounts(REPAIR_SQL, rows));

      const repairedChecking = await balances(checkingId);
      const repairedCard = await balances(cardId);
      expect(repairedChecking.current).toBe(beforeChecking.current);
      expect(repairedCard.current).toBe(beforeCard.current);
      expect(new Prisma.Decimal(repairedChecking.initial).minus(beforeChecking.initial).toString()).toBe("250");
      expect(new Prisma.Decimal(repairedCard.initial).minus(beforeCard.initial).toString()).toBe("-400");
      expectAllZero(await runCheck(), allIds);

      await prisma.$executeRawUnsafe(withAccounts(UNDO_SQL, rows));

      expect(await balances(checkingId)).toEqual(beforeChecking);
      expect(await balances(cardId)).toEqual(beforeCard);
      const after = await runCheck();
      expect(after[checkingId].diff.toString()).toBe("250");
      expect(after[cardId].diff.toString()).toBe("-400");
    } finally {
      await setCurrent(checkingId, originals[checkingId]);
      await setCurrent(cardId, originals[cardId]);
    }
    expectAllZero(await runCheck(), allIds);
  });

  test("the undo rejects an account that was never repaired", async () => {
    const original = await corrupt(checkingId, "250");
    try {
      const before = await balances(checkingId);
      await expect(
        prisma.$executeRawUnsafe(withAccounts(UNDO_SQL, [[checkingId, "250"]]))
      ).rejects.toThrow(/live diff/);
      expect(await balances(checkingId)).toEqual(before);
    } finally {
      await setCurrent(checkingId, original);
    }
    expectAllZero(await runCheck(), allIds);
  });

  test("a second undo after a successful undo is rejected and changes nothing", async () => {
    const original = await corrupt(checkingId, "250");
    try {
      const start = await balances(checkingId);
      const rows: Array<[string, string]> = [[checkingId, "250"]];

      await prisma.$executeRawUnsafe(withAccounts(REPAIR_SQL, rows));
      await prisma.$executeRawUnsafe(withAccounts(UNDO_SQL, rows));
      const afterUndo = await balances(checkingId);
      expect(afterUndo).toEqual(start);

      await expect(prisma.$executeRawUnsafe(withAccounts(UNDO_SQL, rows))).rejects.toThrow(/live diff/);
      expect(await balances(checkingId)).toEqual(afterUndo);
    } finally {
      await setCurrent(checkingId, original);
    }
    expectAllZero(await runCheck(), allIds);
  });
});
