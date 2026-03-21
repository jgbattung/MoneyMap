import { describe, it, expect } from "vitest";
import {
  createExpenseTransactionSchema,
  updateExpenseTransactionSchema,
} from "../expense-transactions";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseNonInstallment = {
  accountId: "acc-1",
  expenseTypeId: "type-1",
  name: "Test Expense",
  amount: "100",
  isInstallment: false,
  date: new Date("2024-01-01"),
};

const baseInstallment = {
  accountId: "acc-1",
  expenseTypeId: "type-1",
  name: "Test Expense",
  amount: "100",
  isInstallment: true,
  installmentDuration: 12,
  installmentStartDate: new Date("2024-01-01"),
};

// ---------------------------------------------------------------------------
// createExpenseTransactionSchema — superRefine gap coverage
// ---------------------------------------------------------------------------

describe("createExpenseTransactionSchema — superRefine extended cases", () => {
  it("reports both installmentDuration and installmentStartDate errors when both are missing", () => {
    const data = {
      ...baseNonInstallment,
      date: undefined,
      isInstallment: true,
      installmentDuration: null,
      installmentStartDate: null,
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("installmentDuration");
      expect(paths).toContain("installmentStartDate");
    }
  });

  it("fails when installmentDuration is 0 (not positive)", () => {
    const data = {
      ...baseNonInstallment,
      date: undefined,
      isInstallment: true,
      installmentDuration: 0,
      installmentStartDate: new Date("2024-01-01"),
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === "installmentDuration"
      );
      expect(issue).toBeDefined();
    }
  });

  it("passes when non-installment has a date even if installment fields are absent", () => {
    const result = createExpenseTransactionSchema.safeParse(baseNonInstallment);
    expect(result.success).toBe(true);
  });

  it("does not require installment fields when isInstallment is false", () => {
    const data = {
      ...baseNonInstallment,
      installmentDuration: undefined,
      installmentStartDate: undefined,
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("fails base validation when accountId is empty", () => {
    const data = { ...baseNonInstallment, accountId: "" };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("accountId");
    }
  });

  it("fails base validation when name exceeds 100 characters", () => {
    const data = { ...baseNonInstallment, name: "a".repeat(101) };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("name");
    }
  });

  it("fails base validation when amount is not a positive number", () => {
    const data = { ...baseNonInstallment, amount: "-5" };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("amount");
    }
  });

  it("fails base validation when amount is non-numeric", () => {
    const data = { ...baseNonInstallment, amount: "abc" };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("amount");
    }
  });

  it("fails base validation when expenseTypeId is empty", () => {
    const data = { ...baseNonInstallment, expenseTypeId: "" };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("expenseTypeId");
    }
  });

  it("passes with optional description and subcategory populated", () => {
    const data = {
      ...baseNonInstallment,
      description: "A memo",
      expenseSubcategoryId: "sub-1",
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("passes with tagIds array within the 10-item limit", () => {
    const data = {
      ...baseNonInstallment,
      tagIds: ["t1", "t2", "t3"],
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("fails when tagIds exceeds 10 items", () => {
    const data = {
      ...baseNonInstallment,
      tagIds: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("tagIds");
    }
  });
});

// ---------------------------------------------------------------------------
// updateExpenseTransactionSchema
// ---------------------------------------------------------------------------

describe("updateExpenseTransactionSchema", () => {
  it("passes with only id and one updated field", () => {
    const result = updateExpenseTransactionSchema.safeParse({
      id: "txn-1",
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });

  it("passes with id and all base fields provided", () => {
    const result = updateExpenseTransactionSchema.safeParse({
      id: "txn-1",
      ...baseNonInstallment,
    });
    expect(result.success).toBe(true);
  });

  it("fails when id is missing", () => {
    const result = updateExpenseTransactionSchema.safeParse({
      name: "Updated Name",
      amount: "50",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("id");
    }
  });

  it("fails when id is an empty string", () => {
    const result = updateExpenseTransactionSchema.safeParse({
      id: "",
      name: "Updated Name",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "id");
      expect(issue?.message).toBe("ID is required");
    }
  });

  it("passes when only id is provided (all other fields are optional)", () => {
    const result = updateExpenseTransactionSchema.safeParse({ id: "txn-1" });
    expect(result.success).toBe(true);
  });

  it("fails when amount is provided but invalid", () => {
    const result = updateExpenseTransactionSchema.safeParse({
      id: "txn-1",
      amount: "not-a-number",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("amount");
    }
  });

  it("passes with installment fields on update", () => {
    const result = updateExpenseTransactionSchema.safeParse({
      id: "txn-1",
      ...baseInstallment,
    });
    expect(result.success).toBe(true);
  });
});
