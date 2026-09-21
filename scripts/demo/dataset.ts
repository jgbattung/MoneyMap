/**
 * Synthetic demo dataset generator.
 *
 * Pure data construction: this module never touches a database and never imports a
 * Prisma client. `seed.ts` owns all I/O. Keeping generation pure means the shape of the
 * data can be reasoned about (and unit-tested) without a connection anywhere near it.
 *
 * Design goals, in order:
 *   1. **Reconciliation.** Every account's closing balance is computed FROM the emitted
 *      rows using the same arithmetic the API mutation pipeline uses, so the denormalised
 *      `currentBalance` cannot drift from the ledger by construction.
 *   2. **Shape, not noise.** Charts must show a story. Payroll lands semi-monthly, dining
 *      and transport cluster at weekends, utilities and subscriptions recur monthly, and
 *      one month goes negative because of a trip. Uniform random numbers would render as
 *      a flat, meaningless smear.
 *   3. **Determinism.** A fixed RNG seed, so two runs on the same day produce the same
 *      dataset and screenshots do not churn.
 *
 * Balance arithmetic mirrors `src/app/api/CLAUDE.md`:
 *   expense = -amount, income = +amount,
 *   transfer = -amount on from, +amount on to, and the fee is a real ExpenseTransaction
 *   on the from account (so the expense pass already accounts for it - do not subtract
 *   it twice). Installment PARENT rows never move a balance; their generated children do.
 */

import { DEMO_USER_ID } from "./connection";

/* -------------------------------------------------------------------------- */
/* Deterministic RNG                                                          */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0x5eed1a7e);

const rand = (): number => rng();
const between = (min: number, max: number): number => min + rand() * (max - min);
const intBetween = (min: number, max: number): number =>
  Math.floor(between(min, max + 1 - Number.EPSILON));
const pick = <T,>(items: readonly T[]): T => items[intBetween(0, items.length - 1)];
const round2 = (n: number): number => Math.round(n * 100) / 100;

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * UTC midnight, matching `formatDateForAPI` semantics: the client builds a local-calendar
 * `YYYY-MM-DD` string and the route does `new Date("2026-07-29")`, which JS parses as
 * UTC midnight. See the "Date Storage Shapes" note in `.gsd/project-context.md`.
 */
const utc = (year: number, monthIndex: number, day: number): Date =>
  new Date(Date.UTC(year, monthIndex, day));

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** 0 = Sunday, 6 = Saturday. */
const weekdayOf = (year: number, monthIndex: number, day: number): number =>
  utc(year, monthIndex, day).getUTCDay();

const isWeekend = (year: number, monthIndex: number, day: number): boolean => {
  const d = weekdayOf(year, monthIndex, day);
  return d === 0 || d === 6;
};

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                 */
/* -------------------------------------------------------------------------- */

export type AccountTypeName =
  | "CHECKING"
  | "SAVINGS"
  | "CREDIT_CARD"
  | "INVESTMENT"
  | "CASH"
  | "RETIREMENT"
  | "E_WALLET";

export interface AccountRow {
  id: string;
  name: string;
  accountType: AccountTypeName;
  initialBalance: number;
  currentBalance: number;
  addToNetWorth: boolean;
  statementDate: number | null;
  dueDate: number | null;
  cardGroup: string | null;
  statementBalance: number | null;
  previousStatementBalance: number | null;
  lastStatementCalculationDate: Date | null;
}

export interface ExpenseTypeRow {
  id: string;
  name: string;
  monthlyBudget: number | null;
  isSystem: boolean;
}

export interface SubcategoryRow {
  id: string;
  expenseTypeId: string;
  name: string;
}

export interface IncomeTypeRow {
  id: string;
  name: string;
  monthlyTarget: number | null;
}

export interface TransferTypeRow {
  id: string;
  name: string;
}

export interface TagRow {
  id: string;
  name: string;
  color: string;
}

export interface ExpenseRow {
  id: string;
  accountId: string;
  expenseTypeId: string;
  expenseSubcategoryId: string | null;
  name: string;
  amount: number;
  date: Date;
  description: string | null;
  isInstallment: boolean;
  installmentDuration: number | null;
  remainingInstallments: number | null;
  installmentStartDate: Date | null;
  monthlyAmount: number | null;
  lastProcessedDate: Date | null;
  isSystemGenerated: boolean;
  parentInstallmentId: string | null;
  installmentStatus: string | null;
}

export interface IncomeRow {
  id: string;
  accountId: string;
  incomeTypeId: string;
  name: string;
  amount: number;
  date: Date;
  description: string | null;
}

export interface TransferRow {
  id: string;
  name: string;
  amount: number;
  fromAccountId: string;
  toAccountId: string;
  transferTypeId: string;
  date: Date;
  notes: string | null;
  feeAmount: number | null;
  feeExpenseId: string | null;
}

export interface DemoDataset {
  userId: string;
  netWorthTarget: number;
  netWorthTargetDate: Date;
  accounts: AccountRow[];
  expenseTypes: ExpenseTypeRow[];
  subcategories: SubcategoryRow[];
  incomeTypes: IncomeTypeRow[];
  transferTypes: TransferTypeRow[];
  tags: TagRow[];
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  transfers: TransferRow[];
  /** tag id -> the expense / income rows it is attached to. */
  tagLinks: Record<string, { expenseIds: string[]; incomeIds: string[] }>;
}

/* -------------------------------------------------------------------------- */
/* Static reference data                                                      */
/* -------------------------------------------------------------------------- */

const ACC = {
  checking: "demo-acct-checking",
  savings: "demo-acct-savings",
  emergency: "demo-acct-emergency",
  cash: "demo-acct-cash",
  gcash: "demo-acct-gcash",
  invest: "demo-acct-invest",
  mp2: "demo-acct-mp2",
  cardGold: "demo-card-bpi-gold",
  cardEdge: "demo-card-bpi-edge",
  cardUnion: "demo-card-unionbank",
} as const;

const ET = {
  rent: "demo-etype-rent",
  groceries: "demo-etype-groceries",
  dining: "demo-etype-dining",
  transport: "demo-etype-transport",
  utilities: "demo-etype-utilities",
  subscriptions: "demo-etype-subscriptions",
  health: "demo-etype-health",
  shopping: "demo-etype-shopping",
  travel: "demo-etype-travel",
  gifts: "demo-etype-gifts",
  electronics: "demo-etype-electronics",
  insurance: "demo-etype-insurance",
  fees: "demo-etype-fees",
  transferFee: "demo-etype-transfer-fee",
} as const;

const IT = {
  salary: "demo-itype-salary",
  freelance: "demo-itype-freelance",
  dividends: "demo-itype-dividends",
  rebates: "demo-itype-rebates",
  gifts: "demo-itype-gifts",
} as const;

const TT = {
  internal: "demo-ttype-internal",
  cardPayment: "demo-ttype-card-payment",
  savings: "demo-ttype-savings",
  investing: "demo-ttype-investing",
} as const;

const TAG = {
  japan: "demo-tag-japan",
  homeOffice: "demo-tag-home-office",
} as const;

/** The "Credit Card Payment" transfer type name is load-bearing: `statement-calculator.ts`
 *  matches on it by name to decide whether a transfer reduces a statement balance. */
const CREDIT_CARD_PAYMENT = "Credit Card Payment";

const DAY_MS = 24 * 60 * 60 * 1000;

interface CardSpec {
  statementDay: number;
  dueDay: number;
  cardGroup: string | null;
}

/** Statement day, due day and grouping per card. Deliberately distinct per card so the
 *  cards surface shows three different cycles rather than three copies of one. */
const CARD_SPECS: Record<string, CardSpec> = {
  [ACC.cardGold]: { statementDay: 5, dueDay: 25, cardGroup: "BPI Cards" },
  [ACC.cardEdge]: { statementDay: 12, dueDay: 2, cardGroup: "BPI Cards" },
  [ACC.cardUnion]: { statementDay: 18, dueDay: 8, cardGroup: null },
};

const CARD_IDS: readonly string[] = [ACC.cardGold, ACC.cardEdge, ACC.cardUnion];

const SUBCATEGORIES: SubcategoryRow[] = [
  { id: "demo-sub-supermarket", expenseTypeId: ET.groceries, name: "Supermarket" },
  { id: "demo-sub-wet-market", expenseTypeId: ET.groceries, name: "Wet Market" },
  { id: "demo-sub-convenience", expenseTypeId: ET.groceries, name: "Convenience Store" },
  { id: "demo-sub-coffee", expenseTypeId: ET.dining, name: "Coffee" },
  { id: "demo-sub-restaurants", expenseTypeId: ET.dining, name: "Restaurants" },
  { id: "demo-sub-delivery", expenseTypeId: ET.dining, name: "Food Delivery" },
  { id: "demo-sub-rideshare", expenseTypeId: ET.transport, name: "Rideshare" },
  { id: "demo-sub-fuel", expenseTypeId: ET.transport, name: "Fuel" },
  { id: "demo-sub-tolls", expenseTypeId: ET.transport, name: "Tolls and Parking" },
  { id: "demo-sub-electricity", expenseTypeId: ET.utilities, name: "Electricity" },
  { id: "demo-sub-water", expenseTypeId: ET.utilities, name: "Water" },
  { id: "demo-sub-internet", expenseTypeId: ET.utilities, name: "Internet" },
  { id: "demo-sub-mobile", expenseTypeId: ET.utilities, name: "Mobile" },
];

const MERCHANTS = {
  supermarket: ["SM Supermarket", "Landers Superstore", "Robinsons Supermarket", "S&R"],
  wetMarket: ["Farmers Market", "Kamuning Market"],
  convenience: ["7-Eleven", "Alfamart", "FamilyMart"],
  coffee: ["Tim Hortons", "Starbucks", "Local roastery", "Kuppa Coffee"],
  restaurants: ["Ramen Nagi", "Mesa Filipino", "Yabu", "Bonchon", "Ippudo", "Silantro"],
  delivery: ["GrabFood order", "Foodpanda order"],
  rideshare: ["Grab ride", "Angkas ride"],
  fuel: ["Shell fuel", "Petron fuel", "Caltex fuel"],
  tolls: ["NLEX toll", "Mall parking", "Autosweep reload"],
  health: ["Gym membership", "Pharmacy run", "Dental checkup", "Vitamins and supplements"],
  shopping: [
    "Uniqlo",
    "Decathlon",
    "Lazada order",
    "Shopee order",
    "Muji",
    "National Book Store",
  ],
  gifts: ["Birthday gift", "Church donation", "Wedding gift", "Charity donation"],
} as const;

/* -------------------------------------------------------------------------- */
/* Per-category monthly spend targets                                         */
/* -------------------------------------------------------------------------- */

/**
 * Monthly peso spend targets per category, as [min, max].
 *
 * These are deliberately calibrated against the budgets below so the budgets surface
 * reads as a story rather than a wall of identical bars. The CURRENT month overrides
 * these with fixed figures (see `CURRENT_MONTH_TARGETS`) so that the budget screenshot
 * is reproducible: most categories comfortable, Subscriptions and Rent at the line, and
 * exactly one category - Dining Out - over.
 */
const MONTHLY_TARGETS: Record<string, [number, number]> = {
  [ET.groceries]: [11400, 13900],
  [ET.dining]: [5500, 7200],
  [ET.transport]: [3800, 5200],
  [ET.health]: [1100, 2700],
  [ET.shopping]: [2200, 5400],
  [ET.gifts]: [300, 1700],
  [ET.fees]: [80, 420],
};

const CURRENT_MONTH_TARGETS: Record<string, number> = {
  [ET.groceries]: 12600, //  84% of 15,000 - comfortable
  [ET.dining]: 8200, // 109% of  7,500 - THE over-budget category
  [ET.transport]: 4100, //  75% of  5,500
  [ET.health]: 1850, //  62% of  3,000
  [ET.shopping]: 2900, //  48% of  6,000
  [ET.gifts]: 900, //  45% of  2,000
  [ET.fees]: 260,
};

const BUDGETS: Record<string, number | null> = {
  [ET.rent]: 22000,
  [ET.groceries]: 15000,
  [ET.dining]: 7500,
  [ET.transport]: 5500,
  [ET.utilities]: 7500,
  [ET.subscriptions]: 1500,
  [ET.health]: 3000,
  [ET.shopping]: 6000,
  [ET.travel]: 8000,
  [ET.gifts]: 2000,
  [ET.insurance]: 4500,
  // The installment plan lives in its own category with its own budget. Left in
  // Shopping it would swamp that budget and produce a SECOND over-budget bar, which
  // muddles the one story the budgets screen is meant to tell.
  [ET.electronics]: 8000,
  [ET.fees]: null,
  [ET.transferFee]: null,
};

/* -------------------------------------------------------------------------- */
/* Generator                                                                  */
/* -------------------------------------------------------------------------- */

export function buildDemoDataset(now: Date = new Date()): DemoDataset {
  const todayYear = now.getUTCFullYear();
  const todayMonth = now.getUTCMonth();
  const todayDay = now.getUTCDate();

  /** 12 calendar months ending with the current (partial) month. */
  const months: Array<{ year: number; month: number; isCurrent: boolean }> = [];
  for (let back = 11; back >= 0; back--) {
    const d = new Date(Date.UTC(todayYear, todayMonth - back, 1));
    months.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      isCurrent: back === 0,
    });
  }

  /** The month the trip lands in - three months back, so it is visible in every chart. */
  const tripMonth = months[months.length - 4];

  const expenses: ExpenseRow[] = [];
  const incomes: IncomeRow[] = [];
  const transfers: TransferRow[] = [];
  const tagLinks: Record<string, { expenseIds: string[]; incomeIds: string[] }> = {
    [TAG.japan]: { expenseIds: [], incomeIds: [] },
    [TAG.homeOffice]: { expenseIds: [], incomeIds: [] },
  };

  let seq = 0;
  const nextId = (prefix: string): string =>
    `demo-${prefix}-${String(++seq).padStart(5, "0")}`;

  const addExpense = (row: {
    accountId: string;
    expenseTypeId: string;
    subcategoryId?: string | null;
    name: string;
    amount: number;
    date: Date;
    description?: string | null;
  }): ExpenseRow => {
    const expense: ExpenseRow = {
      id: nextId("exp"),
      accountId: row.accountId,
      expenseTypeId: row.expenseTypeId,
      expenseSubcategoryId: row.subcategoryId ?? null,
      name: row.name,
      amount: round2(row.amount),
      date: row.date,
      description: row.description ?? null,
      isInstallment: false,
      installmentDuration: null,
      remainingInstallments: null,
      installmentStartDate: null,
      monthlyAmount: null,
      lastProcessedDate: null,
      isSystemGenerated: false,
      parentInstallmentId: null,
      installmentStatus: null,
    };
    expenses.push(expense);
    return expense;
  };

  const addIncome = (row: {
    accountId: string;
    incomeTypeId: string;
    name: string;
    amount: number;
    date: Date;
    description?: string | null;
  }): IncomeRow => {
    const income: IncomeRow = {
      id: nextId("inc"),
      accountId: row.accountId,
      incomeTypeId: row.incomeTypeId,
      name: row.name,
      amount: round2(row.amount),
      date: row.date,
      description: row.description ?? null,
    };
    incomes.push(income);
    return income;
  };

  const addTransfer = (row: {
    name: string;
    amount: number;
    fromAccountId: string;
    toAccountId: string;
    transferTypeId: string;
    date: Date;
    notes?: string | null;
    feeAmount?: number;
    feeLabel?: string;
  }): TransferRow => {
    let feeExpenseId: string | null = null;

    // A fee-bearing transfer writes a real linked ExpenseTransaction on the FROM
    // account, exactly as `POST /api/transfer-transactions` does. The balance effect of
    // the fee therefore comes from the expense pass, not from the transfer pass.
    if (row.feeAmount && row.feeAmount > 0) {
      const feeExpense = addExpense({
        accountId: row.fromAccountId,
        expenseTypeId: ET.transferFee,
        name: `Transfer fee: ${row.name}`,
        amount: row.feeAmount,
        date: row.date,
        description: row.feeLabel ?? null,
      });
      feeExpenseId = feeExpense.id;
    }

    const transfer: TransferRow = {
      id: nextId("trf"),
      name: row.name,
      amount: round2(row.amount),
      fromAccountId: row.fromAccountId,
      toAccountId: row.toAccountId,
      transferTypeId: row.transferTypeId,
      date: row.date,
      notes: row.notes ?? null,
      feeAmount: row.feeAmount ? round2(row.feeAmount) : null,
      feeExpenseId,
    };
    transfers.push(transfer);
    return transfer;
  };

  /**
   * Splits a monthly target into believable individual purchases and emits them on days
   * the category actually clusters on.
   */
  const emitCategory = (
    ctx: { year: number; month: number; lastDay: number },
    opts: {
      expenseTypeId: string;
      target: number;
      count: number;
      weekendBias: boolean;
      pickName: () => { name: string; subcategoryId: string | null };
      pickAccount: () => string;
    },
  ): void => {
    if (opts.target <= 0 || opts.count <= 0) return;

    // Split the target into `count` parts with plausible variance, then normalise back
    // so the month lands on the target exactly. Budget percentages stay predictable.
    const weights: number[] = [];
    for (let i = 0; i < opts.count; i++) weights.push(between(0.55, 1.6));
    const weightSum = weights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < opts.count; i++) {
      let day = intBetween(1, ctx.lastDay);
      if (opts.weekendBias) {
        // Three draws, keep the first weekend day. Produces visible weekend density in
        // the activity calendar without making weekdays empty.
        for (let attempt = 0; attempt < 3; attempt++) {
          if (isWeekend(ctx.year, ctx.month, day)) break;
          day = intBetween(1, ctx.lastDay);
        }
      }
      const { name, subcategoryId } = opts.pickName();
      addExpense({
        accountId: opts.pickAccount(),
        expenseTypeId: opts.expenseTypeId,
        subcategoryId,
        name,
        amount: (opts.target * weights[i]) / weightSum,
        date: utc(ctx.year, ctx.month, day),
      });
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Month loop                                                             */
  /* ---------------------------------------------------------------------- */

  for (const m of months) {
    const monthLength = daysInMonth(m.year, m.month);
    // The current month is partial: nothing may be dated in the future.
    const lastDay = m.isCurrent ? Math.min(todayDay, monthLength) : monthLength;
    const ctx = { year: m.year, month: m.month, lastDay };

    const targetFor = (typeId: string): number => {
      if (m.isCurrent) return CURRENT_MONTH_TARGETS[typeId] ?? 0;
      const [lo, hi] = MONTHLY_TARGETS[typeId];
      return round2(between(lo, hi));
    };

    /* ---- Income: semi-monthly payroll spikes ---- */
    if (15 <= lastDay) {
      addIncome({
        accountId: ACC.checking,
        incomeTypeId: IT.salary,
        name: "Payroll - 1st half",
        amount: 39000,
        date: utc(m.year, m.month, 15),
        description: "Semi-monthly salary credit",
      });
    }
    if (monthLength <= lastDay) {
      addIncome({
        accountId: ACC.checking,
        incomeTypeId: IT.salary,
        name: "Payroll - 2nd half",
        amount: 39000,
        date: utc(m.year, m.month, monthLength),
        description: "Semi-monthly salary credit",
      });
    }

    // Freelance work: one or two invoices a month, irregular by nature.
    const invoices = intBetween(1, 2);
    for (let i = 0; i < invoices; i++) {
      const day = intBetween(4, Math.min(26, lastDay));
      if (day > lastDay) continue;
      addIncome({
        accountId: ACC.checking,
        incomeTypeId: IT.freelance,
        name: pick([
          "Client retainer - Aperture",
          "Landing page build",
          "Dashboard consulting",
          "API integration work",
        ]),
        amount: round2(between(7500, 24000)),
        date: utc(m.year, m.month, day),
      });
    }

    if (12 <= lastDay) {
      addIncome({
        accountId: ACC.savings,
        incomeTypeId: IT.dividends,
        name: "Savings interest",
        amount: round2(between(180, 460)),
        date: utc(m.year, m.month, 12),
      });
    }
    if (rand() < 0.4 && 20 <= lastDay) {
      addIncome({
        accountId: ACC.invest,
        incomeTypeId: IT.dividends,
        name: "Index fund dividend",
        amount: round2(between(600, 1900)),
        date: utc(m.year, m.month, 20),
      });
    }
    // A card rebate posts as income ON the card, which is the path that reduces a
    // statement balance rather than a cash balance.
    if (rand() < 0.5 && 14 <= lastDay) {
      addIncome({
        accountId: ACC.cardGold,
        incomeTypeId: IT.rebates,
        name: "Cashback rebate",
        amount: round2(between(120, 680)),
        date: utc(m.year, m.month, 14),
      });
    }

    /* ---- Fixed monthly obligations ---- */
    if (1 <= lastDay) {
      addExpense({
        accountId: ACC.checking,
        expenseTypeId: ET.rent,
        name: "Condo rent",
        amount: 22000,
        date: utc(m.year, m.month, 1),
        description: "Monthly rent",
      });
    }

    const utilities: Array<[number, string, string, number, number]> = [
      [8, "Meralco electricity", "demo-sub-electricity", 2100, 3900],
      [10, "Maynilad water", "demo-sub-water", 360, 540],
      [12, "Converge fibre", "demo-sub-internet", 1699, 1699],
      [15, "Globe postpaid", "demo-sub-mobile", 999, 999],
    ];
    for (const [day, name, subcategoryId, lo, hi] of utilities) {
      if (day > lastDay) continue;
      addExpense({
        accountId: ACC.checking,
        expenseTypeId: ET.utilities,
        subcategoryId,
        name,
        amount: lo === hi ? lo : round2(between(lo, hi)),
        date: utc(m.year, m.month, day),
      });
    }

    if (20 <= lastDay) {
      addExpense({
        accountId: ACC.checking,
        expenseTypeId: ET.insurance,
        name: "HMO and life insurance",
        amount: 3800,
        date: utc(m.year, m.month, 20),
        description: "Monthly premium",
      });
    }

    const subscriptions: Array<[number, string, number, string]> = [
      [3, "Netflix", 549, ACC.cardUnion],
      [7, "Spotify", 194, ACC.cardUnion],
      [12, "iCloud+ storage", 149, ACC.cardGold],
      [18, "GitHub Copilot", 583, ACC.cardGold],
    ];
    for (const [day, name, amount, accountId] of subscriptions) {
      if (day > lastDay) continue;
      const row = addExpense({
        accountId,
        expenseTypeId: ET.subscriptions,
        name,
        amount,
        date: utc(m.year, m.month, day),
      });
      if (name === "GitHub Copilot") tagLinks[TAG.homeOffice].expenseIds.push(row.id);
    }

    /* ---- Variable categories ---- */
    emitCategory(ctx, {
      expenseTypeId: ET.groceries,
      target: targetFor(ET.groceries),
      count: intBetween(4, 6),
      weekendBias: true,
      pickName: () => {
        const roll = rand();
        if (roll < 0.6)
          return { name: pick(MERCHANTS.supermarket), subcategoryId: "demo-sub-supermarket" };
        if (roll < 0.85)
          return { name: pick(MERCHANTS.wetMarket), subcategoryId: "demo-sub-wet-market" };
        return { name: pick(MERCHANTS.convenience), subcategoryId: "demo-sub-convenience" };
      },
      pickAccount: () => (rand() < 0.7 ? ACC.cardGold : ACC.cash),
    });

    emitCategory(ctx, {
      expenseTypeId: ET.dining,
      target: targetFor(ET.dining),
      count: intBetween(10, 15),
      weekendBias: true,
      pickName: () => {
        const roll = rand();
        if (roll < 0.4)
          return { name: pick(MERCHANTS.coffee), subcategoryId: "demo-sub-coffee" };
        if (roll < 0.8)
          return { name: pick(MERCHANTS.restaurants), subcategoryId: "demo-sub-restaurants" };
        return { name: pick(MERCHANTS.delivery), subcategoryId: "demo-sub-delivery" };
      },
      pickAccount: () => (rand() < 0.55 ? ACC.cardEdge : rand() < 0.6 ? ACC.gcash : ACC.cash),
    });

    emitCategory(ctx, {
      expenseTypeId: ET.transport,
      target: targetFor(ET.transport),
      count: intBetween(8, 13),
      weekendBias: false,
      pickName: () => {
        const roll = rand();
        if (roll < 0.55)
          return { name: pick(MERCHANTS.rideshare), subcategoryId: "demo-sub-rideshare" };
        if (roll < 0.85)
          return { name: pick(MERCHANTS.fuel), subcategoryId: "demo-sub-fuel" };
        return { name: pick(MERCHANTS.tolls), subcategoryId: "demo-sub-tolls" };
      },
      pickAccount: () => (rand() < 0.5 ? ACC.gcash : ACC.cardEdge),
    });

    emitCategory(ctx, {
      expenseTypeId: ET.health,
      target: targetFor(ET.health),
      count: intBetween(1, 3),
      weekendBias: false,
      pickName: () => ({ name: pick(MERCHANTS.health), subcategoryId: null }),
      pickAccount: () => (rand() < 0.6 ? ACC.cardUnion : ACC.checking),
    });

    emitCategory(ctx, {
      expenseTypeId: ET.shopping,
      target: targetFor(ET.shopping),
      count: intBetween(1, 4),
      weekendBias: true,
      pickName: () => ({ name: pick(MERCHANTS.shopping), subcategoryId: null }),
      pickAccount: () => (rand() < 0.75 ? ACC.cardGold : ACC.cardUnion),
    });

    emitCategory(ctx, {
      expenseTypeId: ET.gifts,
      target: targetFor(ET.gifts),
      count: intBetween(1, 2),
      weekendBias: false,
      pickName: () => ({ name: pick(MERCHANTS.gifts), subcategoryId: null }),
      pickAccount: () => (rand() < 0.5 ? ACC.cash : ACC.checking),
    });

    emitCategory(ctx, {
      expenseTypeId: ET.fees,
      target: targetFor(ET.fees),
      count: 1,
      weekendBias: false,
      pickName: () => ({ name: "ATM withdrawal fee", subcategoryId: null }),
      pickAccount: () => ACC.checking,
    });

    /* ---- Recurring transfers ---- */
    if (16 <= lastDay) {
      addTransfer({
        name: "Monthly savings",
        amount: 8000,
        fromAccountId: ACC.checking,
        toAccountId: ACC.savings,
        transferTypeId: TT.savings,
        date: utc(m.year, m.month, 16),
        notes: "Pay yourself first",
      });
    }
    // Quarterly emergency-fund contribution, so that account is not a flat line.
    if (14 <= lastDay && m.month % 3 === 1) {
      addTransfer({
        name: "Emergency fund top-up",
        amount: 6000,
        fromAccountId: ACC.checking,
        toAccountId: ACC.emergency,
        transferTypeId: TT.savings,
        date: utc(m.year, m.month, 14),
      });
    }
    if (17 <= lastDay) {
      // Every third month this one carries an InstaPay fee, which exercises the linked
      // fee-expense path end to end.
      const feeBearing = m.month % 3 === 0;
      addTransfer({
        name: "Index fund top-up",
        amount: 5000,
        fromAccountId: ACC.checking,
        toAccountId: ACC.invest,
        transferTypeId: TT.investing,
        date: utc(m.year, m.month, 17),
        feeAmount: feeBearing ? 25 : undefined,
        feeLabel: feeBearing ? "InstaPay transfer fee" : undefined,
      });
    }
    if (18 <= lastDay) {
      addTransfer({
        name: "Pag-IBIG MP2 contribution",
        amount: 3000,
        fromAccountId: ACC.checking,
        toAccountId: ACC.mp2,
        transferTypeId: TT.internal,
        date: utc(m.year, m.month, 18),
      });
    }
    // Cash and the e-wallet are spending floats, not stores of value: they are topped
    // up every month roughly in line with what gets spent from them, so neither drifts
    // into a nonsensical balance over twelve months.
    if (6 <= lastDay) {
      addTransfer({
        name: "ATM withdrawal",
        amount: round2(between(5200, 6800)),
        fromAccountId: ACC.checking,
        toAccountId: ACC.cash,
        transferTypeId: TT.internal,
        date: utc(m.year, m.month, 6),
      });
    }
    if (9 <= lastDay) {
      addTransfer({
        name: "GCash top-up",
        amount: round2(between(3400, 4400)),
        fromAccountId: ACC.checking,
        toAccountId: ACC.gcash,
        transferTypeId: TT.internal,
        date: utc(m.year, m.month, 9),
      });
    }
  }

  /* ---------------------------------------------------------------------- */
  /* The trip - the tagged event, and the one down month                     */
  /* ---------------------------------------------------------------------- */

  const tripDay = (offset: number): Date => utc(tripMonth.year, tripMonth.month, 11 + offset);

  const tripExpenses: Array<[number, string, string, number, string]> = [
    [0, "JAL return flights", ET.travel, 38400, ACC.cardGold],
    [0, "Shinjuku hotel, 5 nights", ET.travel, 26800, ACC.cardGold],
    [1, "JR Pass and Suica top-up", ET.travel, 7450, ACC.cardGold],
    [2, "Ichiran Shinjuku", ET.dining, 1180, ACC.cardEdge],
    [3, "Tsukiji breakfast", ET.dining, 1640, ACC.cardEdge],
    [4, "teamLab Planets tickets", ET.travel, 2900, ACC.cardGold],
    [5, "Don Quijote pasalubong", ET.shopping, 6300, ACC.cardGold],
    [6, "Kyoto day trip", ET.travel, 4820, ACC.cardGold],
    [7, "Airport express and last meal", ET.dining, 1980, ACC.cardEdge],
  ];

  for (const [offset, name, expenseTypeId, amount, accountId] of tripExpenses) {
    const row = addExpense({
      accountId,
      expenseTypeId,
      name,
      amount,
      date: tripDay(offset),
      description: "Japan trip",
    });
    tagLinks[TAG.japan].expenseIds.push(row.id);
  }

  // The event ledger merges expenses AND income under one tag, so the trip has both
  // sides of its story: money that came in for it as well as what it cost.
  const tripIncome = addIncome({
    accountId: ACC.checking,
    incomeTypeId: IT.gifts,
    name: "Travel money from family",
    amount: 15000,
    date: tripDay(-4),
    description: "Japan trip",
  });
  tagLinks[TAG.japan].incomeIds.push(tripIncome.id);

  const tripRefund = addIncome({
    accountId: ACC.cardGold,
    incomeTypeId: IT.rebates,
    name: "Hotel overcharge refund",
    amount: 2350,
    date: tripDay(12),
    description: "Japan trip",
  });
  tagLinks[TAG.japan].incomeIds.push(tripRefund.id);

  // A small home-office thread running through the year, so the ledger has a second,
  // differently shaped event to compare against.
  const officeMonth = months[months.length - 7];
  for (const [offset, name, amount] of [
    [2, "Keychron K3 keyboard", 5490],
    [3, "Monitor arm", 3200],
  ] as Array<[number, string, number]>) {
    const row = addExpense({
      accountId: ACC.cardUnion,
      expenseTypeId: ET.shopping,
      name,
      amount,
      date: utc(officeMonth.year, officeMonth.month, 6 + offset),
      description: "Home office",
    });
    tagLinks[TAG.homeOffice].expenseIds.push(row.id);
  }

  /* ---------------------------------------------------------------------- */
  /* In-flight installment plan                                             */
  /* ---------------------------------------------------------------------- */

  const INSTALLMENT_MONTHS = 12;
  const INSTALLMENT_TOTAL = 74940;
  const monthlyAmount = round2(INSTALLMENT_TOTAL / INSTALLMENT_MONTHS);
  const paymentsMade = 5;
  const planStartMonth = months[months.length - paymentsMade];
  const planStart = utc(planStartMonth.year, planStartMonth.month, 10);

  const lastPaymentMonth = months[months.length - 1];
  const lastProcessedDate = utc(
    lastPaymentMonth.year,
    lastPaymentMonth.month,
    Math.min(10, todayDay),
  );

  const installmentParentId = nextId("exp");
  expenses.push({
    id: installmentParentId,
    accountId: ACC.cardGold,
    expenseTypeId: ET.electronics,
    expenseSubcategoryId: null,
    name: "MacBook Air M4",
    amount: INSTALLMENT_TOTAL,
    date: planStart,
    description: "12-month 0% installment plan",
    // The parent is the PLAN, not a charge. Every aggregate in the app filters
    // `isInstallment: false`, so this row must never move a balance or a budget.
    isInstallment: true,
    installmentDuration: INSTALLMENT_MONTHS,
    remainingInstallments: INSTALLMENT_MONTHS - paymentsMade,
    installmentStartDate: planStart,
    monthlyAmount,
    lastProcessedDate,
    isSystemGenerated: false,
    parentInstallmentId: null,
    installmentStatus: "ACTIVE",
  });

  for (let n = 1; n <= paymentsMade; n++) {
    const paymentMonth = months[months.length - paymentsMade + (n - 1)];
    const day = paymentMonth.isCurrent ? Math.min(10, todayDay) : 10;
    expenses.push({
      id: nextId("exp"),
      accountId: ACC.cardGold,
      expenseTypeId: ET.electronics,
      expenseSubcategoryId: null,
      name: `MacBook Air M4 (Payment ${n}/${INSTALLMENT_MONTHS})`,
      amount: monthlyAmount,
      date: utc(paymentMonth.year, paymentMonth.month, day),
      description: `Installment payment ${n} of ${INSTALLMENT_MONTHS}`,
      isInstallment: false,
      installmentDuration: null,
      remainingInstallments: null,
      installmentStartDate: null,
      monthlyAmount: null,
      lastProcessedDate: null,
      isSystemGenerated: true,
      parentInstallmentId: installmentParentId,
      installmentStatus: "ACTIVE",
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Credit card statement cycles, and the payments that settle them        */
  /* ---------------------------------------------------------------------- */

  // Cards are settled per STATEMENT CYCLE, not per calendar month. Paying "last
  // month's charges" on a fixed day looks plausible but is wrong: the payment lands in
  // a different cycle from the charges it settles, so statement balances drift and can
  // even go negative. Walking the real cycles instead means the seeded statement
  // figures are exactly what `calculateStatementBalance` would recompute for the same
  // window, and every payment settles a statement that actually existed.
  const todayEnd = utc(todayYear, todayMonth, todayDay);
  const cardStatements = new Map<string, { statement: number; previous: number; closedOn: Date }>();

  for (const cardId of CARD_IDS) {
    const spec = CARD_SPECS[cardId];
    let previousStatement = 0;
    let lastClosed: { statement: number; previous: number; closedOn: Date } | null = null;

    for (let i = 0; i < months.length; i++) {
      const closeMonth = months[i];
      const close = utc(closeMonth.year, closeMonth.month, spec.statementDay);
      if (close > todayEnd) break;

      // The cycle that just closed: [statement day of the previous month, close - 1 day].
      const cycleStart = utc(closeMonth.year, closeMonth.month - 1, spec.statementDay);
      const cycleEnd = new Date(close.getTime() - DAY_MS);

      const statement = round2(
        previousStatement + cycleBalance(cardId, cycleStart, cycleEnd, expenses, incomes, transfers),
      );

      // Settle it in full on the due date. A due day at or before the statement day
      // belongs to the following month.
      if (statement > 0) {
        const due =
          spec.dueDay > spec.statementDay
            ? utc(closeMonth.year, closeMonth.month, spec.dueDay)
            : utc(closeMonth.year, closeMonth.month + 1, spec.dueDay);

        if (due <= todayEnd) {
          addTransfer({
            name: "Credit card payment",
            amount: statement,
            fromAccountId: ACC.checking,
            toAccountId: cardId,
            transferTypeId: TT.cardPayment,
            date: due,
            notes: "Statement paid in full",
          });
        }
      }

      lastClosed = { statement, previous: previousStatement, closedOn: close };
      previousStatement = statement;
    }

    if (lastClosed) cardStatements.set(cardId, lastClosed);
  }

  /* ---------------------------------------------------------------------- */
  /* Accounts, with balances derived from the rows above                     */
  /* ---------------------------------------------------------------------- */

  const accounts: AccountRow[] = [
    account(ACC.checking, "BPI Checking", "CHECKING", 45000, true),
    account(ACC.savings, "BPI Save-Up", "SAVINGS", 180000, true),
    account(ACC.emergency, "Security Bank Emergency Fund", "SAVINGS", 120000, true),
    account(ACC.cash, "Cash on Hand", "CASH", 4500, true),
    account(ACC.gcash, "GCash", "E_WALLET", 3200, true),
    account(ACC.invest, "COL Financial", "INVESTMENT", 95000, true),
    // Deliberately excluded from net worth, so the flag is visible in the UI rather
    // than being a setting nobody can see the effect of.
    account(ACC.mp2, "Pag-IBIG MP2", "RETIREMENT", 60000, false),
    card(ACC.cardGold, "BPI Gold Rewards"),
    card(ACC.cardEdge, "BPI Edge"),
    card(ACC.cardUnion, "UnionBank Rewards"),
  ];

  const balances = new Map<string, number>();
  for (const a of accounts) balances.set(a.id, a.initialBalance);

  const move = (accountId: string, delta: number): void => {
    balances.set(accountId, round2((balances.get(accountId) ?? 0) + delta));
  };

  // Installment parents are excluded: the plan is not itself a charge.
  for (const e of expenses) if (!e.isInstallment) move(e.accountId, -e.amount);
  for (const i of incomes) move(i.accountId, i.amount);
  for (const t of transfers) {
    move(t.fromAccountId, -t.amount);
    move(t.toAccountId, t.amount);
    // The fee already moved the balance as an ExpenseTransaction above. Do not
    // subtract it again here - that is the double-count this comment exists to prevent.
  }

  for (const a of accounts) a.currentBalance = round2(balances.get(a.id) ?? 0);

  /* ---------------------------------------------------------------------- */
  /* Denormalised statement fields                                          */
  /* ---------------------------------------------------------------------- */

  // `recalculateForCard` derives the completed cycle from
  // lastStatementCalculationDate, so that field is simply the most recent close date.
  for (const a of accounts) {
    const closed = cardStatements.get(a.id);
    if (!closed) continue;
    a.statementBalance = closed.statement;
    a.previousStatementBalance = closed.previous;
    a.lastStatementCalculationDate = closed.closedOn;
  }

  /* ---------------------------------------------------------------------- */

  const netWorth = accounts
    .filter((a) => a.addToNetWorth)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  return {
    userId: DEMO_USER_ID,
    // A target that is ambitious but reachable, so the reports progress widget shows
    // real progress rather than 3% or 99%.
    netWorthTarget: round2(Math.ceil((netWorth * 1.45) / 10000) * 10000),
    netWorthTargetDate: utc(todayYear + 1, 11, 31),
    accounts,
    expenseTypes: [
      expenseType(ET.rent, "Rent"),
      expenseType(ET.groceries, "Groceries"),
      expenseType(ET.dining, "Dining Out"),
      expenseType(ET.transport, "Transportation"),
      expenseType(ET.utilities, "Utilities"),
      expenseType(ET.subscriptions, "Subscriptions"),
      expenseType(ET.health, "Health and Fitness"),
      expenseType(ET.shopping, "Shopping"),
      expenseType(ET.travel, "Travel"),
      expenseType(ET.gifts, "Gifts and Donations"),
      expenseType(ET.insurance, "Insurance"),
      expenseType(ET.electronics, "Electronics"),
      expenseType(ET.fees, "Fees and Charges"),
      // Created by the transfer route on demand; `isSystem` keeps it out of the
      // user-managed category lists.
      { id: ET.transferFee, name: "Transfer fee", monthlyBudget: null, isSystem: true },
    ],
    subcategories: SUBCATEGORIES,
    incomeTypes: [
      { id: IT.salary, name: "Salary", monthlyTarget: 78000 },
      { id: IT.freelance, name: "Freelance", monthlyTarget: 15000 },
      { id: IT.dividends, name: "Interest and Dividends", monthlyTarget: 1200 },
      { id: IT.rebates, name: "Rebates and Refunds", monthlyTarget: null },
      { id: IT.gifts, name: "Gifts Received", monthlyTarget: null },
    ],
    transferTypes: [
      { id: TT.internal, name: "Internal Transfer" },
      { id: TT.cardPayment, name: CREDIT_CARD_PAYMENT },
      { id: TT.savings, name: "Savings Contribution" },
      { id: TT.investing, name: "Investment Funding" },
    ],
    tags: [
      { id: TAG.japan, name: "Japan Trip", color: "hsl(190, 65%, 60%)" },
      { id: TAG.homeOffice, name: "Home Office", color: "hsl(80, 65%, 60%)" },
    ],
    expenses,
    incomes,
    transfers,
    tagLinks,
  };
}

/* -------------------------------------------------------------------------- */
/* Small builders                                                             */
/* -------------------------------------------------------------------------- */

function account(
  id: string,
  name: string,
  accountType: AccountTypeName,
  initialBalance: number,
  addToNetWorth: boolean,
): AccountRow {
  return {
    id,
    name,
    accountType,
    initialBalance,
    currentBalance: initialBalance,
    addToNetWorth,
    statementDate: null,
    dueDate: null,
    cardGroup: null,
    statementBalance: null,
    previousStatementBalance: null,
    lastStatementCalculationDate: null,
  };
}

function card(id: string, name: string): AccountRow {
  const spec = CARD_SPECS[id];
  return {
    id,
    name,
    accountType: "CREDIT_CARD",
    initialBalance: 0,
    currentBalance: 0,
    addToNetWorth: true,
    statementDate: spec.statementDay,
    dueDate: spec.dueDay,
    cardGroup: spec.cardGroup,
    statementBalance: null,
    previousStatementBalance: null,
    lastStatementCalculationDate: null,
  };
}

function expenseType(id: string, name: string): ExpenseTypeRow {
  return { id, name, monthlyBudget: BUDGETS[id] ?? null, isSystem: false };
}

/**
 * Mirrors `calculateStatementBalance` in `src/lib/statement-calculator.ts`:
 *   expenses + non-payment transfers out - income - card payments in.
 * Computed here over the in-memory rows so the seeded statement figures agree with what
 * the app would recalculate for the same cycle.
 */
function cycleBalance(
  cardId: string,
  start: Date,
  end: Date,
  expenses: ExpenseRow[],
  incomes: IncomeRow[],
  transfers: TransferRow[],
): number {
  const inCycle = (d: Date): boolean => d >= start && d <= end;

  const charged = expenses
    .filter((e) => e.accountId === cardId && !e.isInstallment && inCycle(e.date))
    .reduce((sum, e) => sum + e.amount, 0);

  const credited = incomes
    .filter((i) => i.accountId === cardId && inCycle(i.date))
    .reduce((sum, i) => sum + i.amount, 0);

  const paid = transfers
    .filter(
      (t) => t.toAccountId === cardId && t.transferTypeId === TT.cardPayment && inCycle(t.date),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const transferredOut = transfers
    .filter(
      (t) => t.fromAccountId === cardId && t.transferTypeId !== TT.cardPayment && inCycle(t.date),
    )
    .reduce((sum, t) => sum + t.amount, 0);

  return charged + transferredOut - credited - paid;
}
