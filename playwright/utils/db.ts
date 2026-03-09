import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Deletes all records from all tables in the correct order
 * to respect foreign key constraints.
 */
export async function clearDatabase() {
  await prisma.$transaction([
    // Child transactions first (depend on accounts, types, users)
    prisma.transferTransaction.deleteMany(),
    prisma.incomeTransaction.deleteMany(),
    prisma.expenseTransaction.deleteMany(),

    // Subcategories (depend on expense types)
    prisma.expenseSubcategory.deleteMany(),

    // Types (depend on users)
    prisma.expenseType.deleteMany(),
    prisma.incomeType.deleteMany(),
    prisma.transferType.deleteMany(),

    // Financial accounts (depend on users)
    prisma.financialAccount.deleteMany(),

    // Auth tables (depend on users)
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verification.deleteMany(),

    // Users last
    prisma.user.deleteMany(),
  ]);
}

/**
 * Seeds the minimum base data needed for E2E tests.
 * Creates a test user and common expense/income/transfer types.
 * Returns the created user ID for use in test setup.
 */
export async function seedBaseData() {
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      id: "test-user-id",
      name: "Test User",
      email: "test@moneymap.dev",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Create common expense types
  await prisma.expenseType.createMany({
    data: [
      { id: "expense-type-groceries", userId: user.id, name: "Groceries" },
      { id: "expense-type-dining", userId: user.id, name: "Dining Out" },
      { id: "expense-type-transport", userId: user.id, name: "Transportation" },
      { id: "expense-type-utilities", userId: user.id, name: "Utilities" },
      { id: "expense-type-shopping", userId: user.id, name: "Shopping" },
    ],
  });

  // Create common income types
  await prisma.incomeType.createMany({
    data: [
      { id: "income-type-salary", userId: user.id, name: "Salary" },
      { id: "income-type-freelance", userId: user.id, name: "Freelance" },
    ],
  });

  // Create a transfer type
  await prisma.transferType.createMany({
    data: [
      { id: "transfer-type-internal", userId: user.id, name: "Internal Transfer" },
    ],
  });

  return user;
}

/**
 * Creates an authenticated BetterAuth session for the test user.
 * Returns the session token to be set as a cookie.
 */
export async function createTestSession(userId: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionToken = "e2e-test-session-token";

  // Create BetterAuth credential account
  await prisma.account.create({
    data: {
      id: "test-account-credential",
      accountId: userId,
      providerId: "credential",
      userId,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Create BetterAuth session
  await prisma.session.create({
    data: {
      id: "test-session-id",
      token: sessionToken,
      userId,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    },
  });

  return sessionToken;
}

export { prisma };
