import { describe, it, expect } from "vitest";
import { isMoneyString } from "../money";
import { createExpenseTransactionSchema } from "../expense-transactions";
import { IncomeTransactionValidation } from "../income-transactions";
import { TransferTransactionValidation } from "../transfer-transactions";
import { updateInstallmentSchema } from "../installments";

describe("isMoneyString", () => {
  it.each(["5", "5.5", "5.55", "5.", ".5", ".55", "0", "0.00", "1000000.99"])(
    "accepts %j",
    (value) => {
      expect(isMoneyString(value)).toBe(true);
    }
  );

  it.each([
    "",
    " ",
    "   ",
    ".",
    "-",
    "1e3",
    "1,000",
    "0x10",
    "100.125",
    ".125",
    "5.555",
    "-5.5",
    "5 ",
    " 5",
    "abc",
    "1.2.3",
  ])("rejects %j", (value) => {
    expect(isMoneyString(value)).toBe(false);
  });

  it.each(["-5.5", "-5", "-.5", "5.5", "0"])(
    "accepts %j with allowNegative",
    (value) => {
      expect(isMoneyString(value, { allowNegative: true })).toBe(true);
    }
  );

  it.each(["-", "-.", " ", "", "-100.125", "--5", "-1e3"])(
    "rejects %j with allowNegative",
    (value) => {
      expect(isMoneyString(value, { allowNegative: true })).toBe(false);
    }
  );
});

// AC6: the client form schemas reject a 3rd decimal (the resolvers of the
// expense, income, transfer and installment forms).
describe("client form schemas reject more than 2 decimals", () => {
  it.each([
    ["createExpenseTransactionSchema", createExpenseTransactionSchema, "amount", "Amount"],
    ["IncomeTransactionValidation", IncomeTransactionValidation, "amount", "Amount"],
    ["TransferTransactionValidation", TransferTransactionValidation, "amount", "Amount"],
    ["TransferTransactionValidation", TransferTransactionValidation, "feeAmount", "Fee amount"],
    ["updateInstallmentSchema", updateInstallmentSchema, "amount", "Amount"],
  ] as const)("%s rejects %s \"100.125\" with the money message", (_name, schema, field, label) => {
    const result = schema.safeParse({ [field]: "100.125" });

    expect(result.success).toBe(false);
    const messages = result.success
      ? []
      : result.error.issues.filter((i) => i.path[0] === field).map((i) => i.message);
    expect(messages).toContain(`${label} must be a number with at most 2 decimals`);
  });
});
