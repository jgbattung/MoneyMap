import { describe, it, expect } from "vitest";
import { createExpenseTransactionSchema } from "../expense-transactions";

const baseValid = {
  accountId: "acc-1",
  expenseTypeId: "type-1",
  name: "Test Expense",
  amount: "100",
  isInstallment: false,
  date: new Date("2024-01-01"),
};

describe("createExpenseTransactionSchema", () => {
  it("passes for valid non-installment submission with date", () => {
    const result = createExpenseTransactionSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("fails for non-installment submission without date — error on path 'date'", () => {
    const data = { ...baseValid, date: undefined };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("date");
      const dateIssue = result.error.issues.find((i) => i.path[0] === "date");
      expect(dateIssue?.message).toBe("Date is required");
    }
  });

  it("passes for valid installment submission with duration and start date", () => {
    const data = {
      ...baseValid,
      date: undefined,
      isInstallment: true,
      installmentDuration: 12,
      installmentStartDate: new Date("2024-01-01"),
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("fails for installment missing duration — error on path 'installmentDuration'", () => {
    const data = {
      ...baseValid,
      date: undefined,
      isInstallment: true,
      installmentDuration: null,
      installmentStartDate: new Date("2024-01-01"),
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("installmentDuration");
      const issue = result.error.issues.find((i) => i.path[0] === "installmentDuration");
      expect(issue?.message).toBe("Duration is required for installment expenses");
    }
  });

  it("fails for installment missing start date — error on path 'installmentStartDate'", () => {
    const data = {
      ...baseValid,
      date: undefined,
      isInstallment: true,
      installmentDuration: 12,
      installmentStartDate: null,
    };
    const result = createExpenseTransactionSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("installmentStartDate");
      const issue = result.error.issues.find((i) => i.path[0] === "installmentStartDate");
      expect(issue?.message).toBe("Start date is required for installment expenses");
    }
  });
});
