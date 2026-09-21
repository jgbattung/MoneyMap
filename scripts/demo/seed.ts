/**
 * Seeds the isolated `money_map_demo` database with a synthetic twelve-month history.
 *
 * Run with `npm run seed:demo`. Idempotent: it tears its own data down first, so it is
 * always safe to re-run.
 *
 * SAFETY - all three layers meet here, and the order below is the point:
 *
 *   1. `createDemoClient()` builds the client from a hardcoded literal. Nothing in this
 *      file resolves a connection string, so there is no configuration to get wrong.
 *   2. `assertDemoDatabase()` runs BEFORE any write and refuses unless the connected
 *      database carries the `__demo_db_marker` table. It is a read-only check, so a
 *      refusal leaves a wrongly reached database completely untouched.
 *   3. `resetDemoData()` scopes EVERY delete to the demo user. There is no unscoped
 *      delete anywhere in this file, and the wholesale wipe helper in
 *      `playwright/utils/db.ts` is deliberately NOT reused, because it deletes across
 *      every table with no `where` clause at all.
 *
 * This script never runs a migration. Creating and migrating the demo database is a
 * one-time manual step; see the "Demo data" section of README.md.
 */

import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

import { createDemoClient, DEMO_DB_URL, DEMO_USER_ID } from "./connection";
import { assertDemoDatabase } from "./preflight";
import { buildDemoDataset } from "./dataset";

/** Credentials the screenshot pipeline (and you, by hand) sign in with. */
export const DEMO_EMAIL = "demo@moneymap.app";
export const DEMO_PASSWORD = "moneymap-demo";

const peso = (n: number): string =>
  `${n < 0 ? "-" : ""}PHP ${Math.abs(n).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/* -------------------------------------------------------------------------- */
/* Teardown - SAFETY LAYER 3                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Removes every record belonging to the demo user, in foreign-key-safe order.
 *
 * EVERY call below is scoped. Transfers go first because `TransferTransaction`
 * references `ExpenseTransaction` through `feeExpenseId`. Tag join rows are removed
 * implicitly when the tags themselves go.
 *
 * The only delete not keyed on `userId` is the user row itself, which is scoped on its
 * primary key to the same id - `where: { id: DEMO_USER_ID }`. There is no such thing as
 * a `User.userId`.
 */
export async function resetDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.transferTransaction.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.incomeTransaction.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.expenseTransaction.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.expenseSubcategory.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.expenseType.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.incomeType.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.transferType.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.tag.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.financialAccount.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.session.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.account.deleteMany({ where: { userId: DEMO_USER_ID } });
  await prisma.user.deleteMany({ where: { id: DEMO_USER_ID } });
}

/* -------------------------------------------------------------------------- */
/* Seed                                                                       */
/* -------------------------------------------------------------------------- */

export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  const data = buildDemoDataset();
  const now = new Date();

  await prisma.user.create({
    data: {
      id: DEMO_USER_ID,
      name: "Alex Dela Cruz",
      email: DEMO_EMAIL,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      netWorthTarget: data.netWorthTarget,
      netWorthTargetDate: data.netWorthTargetDate,
    },
  });

  // A real BetterAuth credential account with a real hashed password, so the demo user
  // signs in through the actual sign-in form. This is deliberately NOT a hand-minted
  // session cookie: minting one would mean reading BETTER_AUTH_SECRET from the
  // environment inside scripts/demo/, which Safety Layer 1 forbids outright.
  await prisma.account.create({
    data: {
      id: "demo-account-credential",
      accountId: DEMO_USER_ID,
      providerId: "credential",
      userId: DEMO_USER_ID,
      password: await hashPassword(DEMO_PASSWORD),
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.financialAccount.createMany({
    data: data.accounts.map((a) => ({
      id: a.id,
      userId: DEMO_USER_ID,
      name: a.name,
      accountType: a.accountType,
      initialBalance: a.initialBalance,
      currentBalance: a.currentBalance,
      addToNetWorth: a.addToNetWorth,
      statementDate: a.statementDate,
      dueDate: a.dueDate,
      cardGroup: a.cardGroup,
      statementBalance: a.statementBalance,
      previousStatementBalance: a.previousStatementBalance,
      lastStatementCalculationDate: a.lastStatementCalculationDate,
    })),
  });

  await prisma.expenseType.createMany({
    data: data.expenseTypes.map((t) => ({
      id: t.id,
      userId: DEMO_USER_ID,
      name: t.name,
      monthlyBudget: t.monthlyBudget,
      isSystem: t.isSystem,
    })),
  });

  await prisma.expenseSubcategory.createMany({
    data: data.subcategories.map((s) => ({
      id: s.id,
      userId: DEMO_USER_ID,
      expenseTypeId: s.expenseTypeId,
      name: s.name,
    })),
  });

  await prisma.incomeType.createMany({
    data: data.incomeTypes.map((t) => ({
      id: t.id,
      userId: DEMO_USER_ID,
      name: t.name,
      monthlyTarget: t.monthlyTarget,
    })),
  });

  await prisma.transferType.createMany({
    data: data.transferTypes.map((t) => ({
      id: t.id,
      userId: DEMO_USER_ID,
      name: t.name,
    })),
  });

  await prisma.tag.createMany({
    data: data.tags.map((t) => ({
      id: t.id,
      userId: DEMO_USER_ID,
      name: t.name,
      color: t.color,
    })),
  });

  // Expenses before transfers: TransferTransaction.feeExpenseId points at an
  // ExpenseTransaction, so the fee rows must already exist.
  await prisma.expenseTransaction.createMany({
    data: data.expenses.map((e) => ({
      id: e.id,
      userId: DEMO_USER_ID,
      accountId: e.accountId,
      expenseTypeId: e.expenseTypeId,
      expenseSubcategoryId: e.expenseSubcategoryId,
      name: e.name,
      amount: e.amount,
      date: e.date,
      description: e.description,
      isInstallment: e.isInstallment,
      installmentDuration: e.installmentDuration,
      remainingInstallments: e.remainingInstallments,
      installmentStartDate: e.installmentStartDate,
      monthlyAmount: e.monthlyAmount,
      lastProcessedDate: e.lastProcessedDate,
      isSystemGenerated: e.isSystemGenerated,
      parentInstallmentId: e.parentInstallmentId,
      installmentStatus: e.installmentStatus,
    })),
  });

  await prisma.incomeTransaction.createMany({
    data: data.incomes.map((i) => ({
      id: i.id,
      userId: DEMO_USER_ID,
      accountId: i.accountId,
      incomeTypeId: i.incomeTypeId,
      name: i.name,
      amount: i.amount,
      date: i.date,
      description: i.description,
    })),
  });

  await prisma.transferTransaction.createMany({
    data: data.transfers.map((t) => ({
      id: t.id,
      userId: DEMO_USER_ID,
      name: t.name,
      amount: t.amount,
      fromAccountId: t.fromAccountId,
      toAccountId: t.toAccountId,
      transferTypeId: t.transferTypeId,
      date: t.date,
      notes: t.notes,
      feeAmount: t.feeAmount,
      feeExpenseId: t.feeExpenseId,
    })),
  });

  // Prisma cannot `connect` relations through `updateMany`, so tag attachment is one
  // update per tag composed in a transaction. See src/app/api/CLAUDE.md.
  await prisma.$transaction(
    data.tags.map((tag) =>
      prisma.tag.update({
        where: { id: tag.id },
        data: {
          expenseTransactions: {
            connect: data.tagLinks[tag.id].expenseIds.map((id) => ({ id })),
          },
          incomeTransactions: {
            connect: data.tagLinks[tag.id].incomeIds.map((id) => ({ id })),
          },
        },
      }),
    ),
  );

  /* ---- Report ---- */

  const netWorth = data.accounts
    .filter((a) => a.addToNetWorth)
    .reduce((sum, a) => sum + a.currentBalance, 0);

  console.log("");
  console.log(`  Seeded ${DEMO_DB_URL}`);
  console.log("");
  console.log(`    accounts      ${data.accounts.length}`);
  console.log(`    expenses      ${data.expenses.length}`);
  console.log(`    income        ${data.incomes.length}`);
  console.log(`    transfers     ${data.transfers.length}`);
  console.log(`    categories    ${data.expenseTypes.length} expense / ${data.incomeTypes.length} income`);
  console.log(`    tags          ${data.tags.length}`);
  console.log("");
  for (const a of data.accounts) {
    console.log(`    ${a.name.padEnd(30)} ${peso(a.currentBalance).padStart(18)}`);
  }
  console.log("");
  console.log(`    net worth     ${peso(netWorth)}`);
  console.log(`    target        ${peso(data.netWorthTarget)}`);
  console.log("");
  console.log(`  Sign in at /sign-in as ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log("");
}

/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const prisma = createDemoClient();
  try {
    // Layer 2, before anything else touches the database. Nothing has been written at
    // this point, so a refusal here is a refusal that cost nothing.
    await assertDemoDatabase(prisma);
    await resetDemoData(prisma);
    await seedDemoData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run when this file is the entry point, so the pieces above can be imported by
// safety tests and harnesses without kicking off a real seed as a side effect.
const invokedDirectly = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/demo/seed.ts");

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
