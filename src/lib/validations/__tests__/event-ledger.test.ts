import { describe, it, expect } from "vitest";
import {
  eventLedgerQuerySchema,
  eventLedgerTagSchema,
  eventLedgerFormSchema,
} from "../event-ledger";

describe("eventLedgerQuerySchema", () => {
  it("passes for valid params with tagIds", () => {
    const result = eventLedgerQuerySchema.safeParse({ tagIds: "tag-1,tag-2" });
    expect(result.success).toBe(true);
  });

  it("fails when tagIds is empty string", () => {
    const result = eventLedgerQuerySchema.safeParse({ tagIds: "" });
    expect(result.success).toBe(false);
  });

  it("defaults skip to 0 and take to 10", () => {
    const result = eventLedgerQuerySchema.safeParse({ tagIds: "tag-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skip).toBe(0);
      expect(result.data.take).toBe(10);
    }
  });

  it("coerces skip and take from strings to numbers", () => {
    const result = eventLedgerQuerySchema.safeParse({
      tagIds: "tag-1",
      skip: "5",
      take: "20",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skip).toBe(5);
      expect(result.data.take).toBe(20);
    }
  });

  it("fails when take exceeds 50", () => {
    const result = eventLedgerQuerySchema.safeParse({
      tagIds: "tag-1",
      take: "51",
    });
    expect(result.success).toBe(false);
  });

  it("fails when skip is negative", () => {
    const result = eventLedgerQuerySchema.safeParse({
      tagIds: "tag-1",
      skip: "-1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional startDate and endDate", () => {
    const result = eventLedgerQuerySchema.safeParse({
      tagIds: "tag-1",
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBe("2024-01-01");
      expect(result.data.endDate).toBe("2024-12-31");
    }
  });

  it("accepts optional accountId", () => {
    const result = eventLedgerQuerySchema.safeParse({
      tagIds: "tag-1",
      accountId: "acc-1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accountId).toBe("acc-1");
    }
  });
});

describe("eventLedgerTagSchema", () => {
  it("passes for valid tag params", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionId: "tx-1",
      transactionType: "expense",
      tagId: "tag-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts income as transactionType", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionId: "tx-1",
      transactionType: "income",
      tagId: "tag-1",
    });
    expect(result.success).toBe(true);
  });

  it("fails for invalid transactionType", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionId: "tx-1",
      transactionType: "transfer",
      tagId: "tag-1",
    });
    expect(result.success).toBe(false);
  });

  it("fails when transactionId is empty", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionId: "",
      transactionType: "expense",
      tagId: "tag-1",
    });
    expect(result.success).toBe(false);
  });

  it("fails when tagId is empty", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionId: "tx-1",
      transactionType: "expense",
      tagId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("eventLedgerFormSchema", () => {
  it("passes with at least one tagId", () => {
    const result = eventLedgerFormSchema.safeParse({
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(true);
  });

  it("fails with empty tagIds array", () => {
    const result = eventLedgerFormSchema.safeParse({
      tagIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional dates as null", () => {
    const result = eventLedgerFormSchema.safeParse({
      tagIds: ["tag-1"],
      startDate: null,
      endDate: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts Date objects for dates", () => {
    const result = eventLedgerFormSchema.safeParse({
      tagIds: ["tag-1"],
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional accountId", () => {
    const result = eventLedgerFormSchema.safeParse({
      tagIds: ["tag-1"],
      accountId: "acc-1",
    });
    expect(result.success).toBe(true);
  });
});
