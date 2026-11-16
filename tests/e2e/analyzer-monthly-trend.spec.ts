import { test, expect, type APIRequestContext } from "@playwright/test";
import { prisma } from "../../playwright/utils/db";

// Runs against the real local E2E database (localhost:5433/money_map_dev, enforced by
// playwright/utils/db-guard.ts). Proves what the mocked route tests cannot: Prisma's
// real groupBy(["date"]) shape (numeric _count, Decimal _sum), both stored date shapes
// (UTC midnight and the cron's 00:0x UTC timestamps) landing in the right month, the
// installment-parent exclusion, and the monthly series summing to the real aggregate
// total to the centavo. Then one browser check that the chart draws in place.

const USER_ID = "test-user-id";
const ACCOUNT_ID = "mt-account";
const TYPE_ID = "mt-type-utilities";
const SUB_ELECTRICITY = "mt-sub-electricity";
const SUB_WATER = "mt-sub-water";
const INCOME_TYPE_ID = "mt-income-type";

// Dec 2025 and Feb 2026 have data; Jan 2026 is empty and must zero-fill across the
// year boundary. Amounts are chosen so float summation would drift.
const EXPENSES = [
  { id: "mt-e1", date: "2025-12-05T00:00:00.000Z", amount: "1500.10", sub: SUB_ELECTRICITY },
  { id: "mt-e2", date: "2025-12-31T00:05:00.000Z", amount: "0.20", sub: SUB_ELECTRICITY }, // cron shape
  { id: "mt-e3", date: "2025-12-31T00:00:00.000Z", amount: "0.10", sub: SUB_WATER }, // same day, other shape
  { id: "mt-e4", date: "2026-02-01T00:00:00.000Z", amount: "0.10", sub: SUB_ELECTRICITY },
  { id: "mt-e5", date: "2026-02-14T00:07:00.000Z", amount: "2000.07", sub: SUB_ELECTRICITY }, // cron shape
  { id: "mt-e6", date: "2026-02-28T00:00:00.000Z", amount: "333.33", sub: SUB_WATER },
];

async function cleanup() {
  await prisma.expenseTransaction.deleteMany({ where: { id: { startsWith: "mt-" } } });
  await prisma.incomeTransaction.deleteMany({ where: { id: { startsWith: "mt-" } } });
  await prisma.expenseSubcategory.deleteMany({ where: { id: { startsWith: "mt-" } } });
  await prisma.expenseType.deleteMany({ where: { id: TYPE_ID } });
  await prisma.incomeType.deleteMany({ where: { id: INCOME_TYPE_ID } });
  await prisma.financialAccount.deleteMany({ where: { id: ACCOUNT_ID } });
}

type Month = { month: string; amount: number; count: number };

async function analyze(request: APIRequestContext, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await request.get(`/api/reports/transaction-analysis?${qs}`);
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as {
    totalAmount: number;
    transactionCount: number;
    breakdownBy: string | null;
    monthly: Month[];
  };
}

function sumCents(monthly: Month[]) {
  return monthly.reduce((s, m) => s + Math.round(m.amount * 100), 0);
}

test.describe.serial("Analyzer monthly trend against the real database", () => {
  test.beforeAll(async () => {
    await cleanup();
    await prisma.financialAccount.create({
      data: {
        id: ACCOUNT_ID,
        userId: USER_ID,
        name: "MT Account",
        accountType: "CHECKING",
        initialBalance: 10000,
        currentBalance: 10000,
      },
    });
    await prisma.expenseType.create({ data: { id: TYPE_ID, userId: USER_ID, name: "MT Utilities" } });
    await prisma.expenseSubcategory.createMany({
      data: [
        { id: SUB_ELECTRICITY, userId: USER_ID, expenseTypeId: TYPE_ID, name: "Electricity" },
        { id: SUB_WATER, userId: USER_ID, expenseTypeId: TYPE_ID, name: "Water" },
      ],
    });
    await prisma.expenseTransaction.createMany({
      data: [
        ...EXPENSES.map((e) => ({
          id: e.id,
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          expenseTypeId: TYPE_ID,
          expenseSubcategoryId: e.sub,
          name: `MT ${e.id}`,
          amount: e.amount,
          date: new Date(e.date),
        })),
        // Installment parent: must never count in the monthly series or the total.
        {
          id: "mt-parent",
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          expenseTypeId: TYPE_ID,
          expenseSubcategoryId: SUB_ELECTRICITY,
          name: "MT installment parent",
          amount: "9999.99",
          date: new Date("2026-01-15T00:00:00.000Z"),
          isInstallment: true,
          installmentDuration: 3,
          remainingInstallments: 3,
          installmentStartDate: new Date("2026-01-15T00:00:00.000Z"),
          monthlyAmount: "3333.33",
        },
      ],
    });
    await prisma.incomeType.create({ data: { id: INCOME_TYPE_ID, userId: USER_ID, name: "MT Income" } });
    await prisma.incomeTransaction.createMany({
      data: [
        { id: "mt-i1", userId: USER_ID, accountId: ACCOUNT_ID, incomeTypeId: INCOME_TYPE_ID, name: "MT pay 1", amount: "0.10", date: new Date("2026-03-01T00:00:00.000Z") },
        { id: "mt-i2", userId: USER_ID, accountId: ACCOUNT_ID, incomeTypeId: INCOME_TYPE_ID, name: "MT pay 2", amount: "0.20", date: new Date("2026-05-31T00:05:00.000Z") },
      ],
    });
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test("buckets both date shapes by month, zero-fills Jan, excludes the installment parent", async ({ request }) => {
    const data = await analyze(request, { type: "expense", categoryIds: TYPE_ID });

    expect(data.monthly).toEqual([
      { month: "2025-12", amount: 1500.4, count: 3 },
      { month: "2026-01", amount: 0, count: 0 },
      { month: "2026-02", amount: 2333.5, count: 3 },
    ]);
    expect(data.transactionCount).toBe(6);
    expect(data.totalAmount).toBe(3833.9);
    expect(sumCents(data.monthly)).toBe(Math.round(data.totalAmount * 100));
    expect(data.monthly.reduce((s, m) => s + m.count, 0)).toBe(data.transactionCount);
  });

  test("zero-fills to the requested bounds and matches the aggregate total", async ({ request }) => {
    const data = await analyze(request, {
      type: "expense",
      categoryIds: TYPE_ID,
      startDate: "2025-11-15",
      endDate: "2026-03-10",
    });

    expect(data.monthly.map((m) => m.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(data.monthly[0]).toEqual({ month: "2025-11", amount: 0, count: 0 });
    expect(data.monthly[4]).toEqual({ month: "2026-03", amount: 0, count: 0 });
    expect(sumCents(data.monthly)).toBe(Math.round(data.totalAmount * 100));
  });

  test("includes cron-shaped rows on the To day and honours open-ended bounds", async ({ request }) => {
    // To = Dec 31: the 00:05Z row on Dec 31 must be included.
    const toOnly = await analyze(request, { type: "expense", categoryIds: TYPE_ID, endDate: "2025-12-31" });
    expect(toOnly.monthly).toEqual([{ month: "2025-12", amount: 1500.4, count: 3 }]);

    // From = Feb 14: starts at Feb and ends at the latest match.
    const fromOnly = await analyze(request, { type: "expense", categoryIds: TYPE_ID, startDate: "2026-02-14" });
    expect(fromOnly.monthly).toEqual([{ month: "2026-02", amount: 2333.4, count: 2 }]);
    expect(sumCents(fromOnly.monthly)).toBe(Math.round(fromOnly.totalAmount * 100));
  });

  test("single subcategory (no breakdown) and multi-select subcategories both get the series", async ({ request }) => {
    const single = await analyze(request, { type: "expense", subcategoryIds: SUB_ELECTRICITY });
    expect(single.breakdownBy).toBeNull();
    expect(single.monthly).toEqual([
      { month: "2025-12", amount: 1500.3, count: 2 },
      { month: "2026-01", amount: 0, count: 0 },
      { month: "2026-02", amount: 2000.17, count: 2 },
    ]);
    expect(sumCents(single.monthly)).toBe(Math.round(single.totalAmount * 100));

    const multi = await analyze(request, {
      type: "expense",
      categoryIds: TYPE_ID,
      subcategoryIds: `${SUB_ELECTRICITY},${SUB_WATER}`,
    });
    expect(multi.breakdownBy).toBe("subcategory");
    expect(sumCents(multi.monthly)).toBe(Math.round(multi.totalAmount * 100));
    expect(multi.totalAmount).toBe(3833.9);
  });

  test("income series zero-fills and sums to the total", async ({ request }) => {
    const data = await analyze(request, { type: "income", categoryIds: INCOME_TYPE_ID });
    expect(data.monthly).toEqual([
      { month: "2026-03", amount: 0.1, count: 1 },
      { month: "2026-04", amount: 0, count: 0 },
      { month: "2026-05", amount: 0.2, count: 1 },
    ]);
    expect(sumCents(data.monthly)).toBe(Math.round(data.totalAmount * 100));
    expect(data.totalAmount).toBe(0.3);
  });

  test("the Analyzer draws the trend between the summary stats and the breakdown", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/reports");
    const analyzer = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("Transaction Analyzer", { exact: true }) });
    await expect(analyzer).toBeVisible();

    await analyzer.getByRole("button", { name: "All time" }).click();
    await analyzer.getByRole("button", { name: "Analyze" }).click();

    const stats = page.getByText("Total Amount", { exact: true });
    const trend = page.getByRole("heading", { name: "Monthly Trend" });
    const breakdown = page.getByText(/Breakdown by/);
    await expect(trend).toBeVisible({ timeout: 20000 });
    await expect(stats).toBeVisible();
    await expect(breakdown).toBeVisible();

    // The chart actually draws (recharts is stubbed in every unit test).
    const chart = trend.locator("xpath=..").locator(".recharts-surface");
    await expect(chart.first()).toBeVisible();
    await expect(trend.locator("xpath=..").getByText(/^avg ₱/)).toBeVisible();

    // Position only: stats above the trend, trend above the breakdown.
    const [s, t, b] = await Promise.all([stats.boundingBox(), trend.boundingBox(), breakdown.boundingBox()]);
    expect(s && t && b).toBeTruthy();
    expect(s!.y).toBeLessThan(t!.y);
    expect(t!.y).toBeLessThan(b!.y);
  });
});
