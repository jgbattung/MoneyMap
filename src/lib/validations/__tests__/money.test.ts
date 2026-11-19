import { describe, it, expect } from "vitest";
import { isMoneyString, MONEY_MESSAGE } from "../money";

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

describe("MONEY_MESSAGE", () => {
  it("names the field and the 2 decimal limit", () => {
    expect(MONEY_MESSAGE("Amount")).toBe(
      "Amount must be a number with at most 2 decimals"
    );
  });
});
