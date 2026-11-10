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
  it("passes for valid tag params with a single transactionId", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: ["tx-1"],
      transactionType: "expense",
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(true);
  });

  it("passes for valid tag params with multiple transactionIds and tagIds", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: ["tx-1", "tx-2"],
      transactionType: "expense",
      tagIds: ["tag-1", "tag-2"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts income as transactionType", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: ["tx-1"],
      transactionType: "income",
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(true);
  });

  it("fails for invalid transactionType", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: ["tx-1"],
      transactionType: "transfer",
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(false);
  });

  it("fails when transactionIds is an empty array", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: [],
      transactionType: "expense",
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(false);
  });

  it("fails when transactionIds contains an empty string", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: [""],
      transactionType: "expense",
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(false);
  });

  it("fails when transactionIds exceeds 50 entries", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: Array.from({ length: 51 }, (_, i) => `tx-${i}`),
      transactionType: "expense",
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(false);
  });

  it("passes when transactionIds has exactly 50 entries", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: Array.from({ length: 50 }, (_, i) => `tx-${i}`),
      transactionType: "expense",
      tagIds: ["tag-1"],
    });
    expect(result.success).toBe(true);
  });

  it("fails when tagIds is an empty array", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: ["tx-1"],
      transactionType: "expense",
      tagIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("fails when tagIds contains an empty string", () => {
    const result = eventLedgerTagSchema.safeParse({
      transactionIds: ["tx-1"],
      transactionType: "expense",
      tagIds: [""],
    });
    expect(result.success).toBe(false);
  });
});

describe("eventLedgerFormSchema", () => {
  it("passes with at least one tagId", () => {
    const result = eventLedgerFormSchema.safeParse({
      mode: "tag", tagIds: ["tag-1"],
    });
    expect(result.success).toBe(true);
  });

  it("fails with empty tagIds array", () => {
    const result = eventLedgerFormSchema.safeParse({
      mode: "tag", tagIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional dates as null", () => {
    const result = eventLedgerFormSchema.safeParse({
      mode: "tag", tagIds: ["tag-1"],
      startDate: null,
      endDate: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts Date objects for dates", () => {
    const result = eventLedgerFormSchema.safeParse({
      mode: "tag", tagIds: ["tag-1"],
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-12-31"),
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional accountId", () => {
    const result = eventLedgerFormSchema.safeParse({
      mode: "tag", tagIds: ["tag-1"],
      accountId: "acc-1",
    });
    expect(result.success).toBe(true);
  });
});

describe("eventLedgerQuerySchema - date-range mode", () => {
  it("accepts a range without tags", () => {
    const r = eventLedgerQuerySchema.safeParse({
      startDate: "2026-11-03",
      endDate: "2026-11-09",
    });
    expect(r.success).toBe(true);
  });

  it("accepts tags with a range", () => {
    const r = eventLedgerQuerySchema.safeParse({
      tagIds: "t1",
      startDate: "2026-11-03",
      endDate: "2026-11-09",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a single date with no tags", () => {
    expect(eventLedgerQuerySchema.safeParse({ startDate: "2026-11-03" }).success).toBe(false);
    expect(eventLedgerQuerySchema.safeParse({ endDate: "2026-11-03" }).success).toBe(false);
  });

  it("rejects no tags and no range", () => {
    expect(eventLedgerQuerySchema.safeParse({}).success).toBe(false);
    expect(eventLedgerQuerySchema.safeParse({ tagIds: " , " }).success).toBe(false);
  });

  it("rejects a reversed range with the Analyzer message on endDate", () => {
    const r = eventLedgerQuerySchema.safeParse({
      tagIds: "t1",
      startDate: "2026-11-09",
      endDate: "2026-11-03",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "endDate");
      expect(issue?.message).toBe("End date cannot be before start date");
    }
  });

  it("rejects non YYYY-MM-DD dates", () => {
    expect(
      eventLedgerQuerySchema.safeParse({
        tagIds: "t1",
        startDate: "2026-11-03T00:00:00.000Z",
      }).success
    ).toBe(false);
  });
});

describe("eventLedgerTagSchema - filter body", () => {
  const filter = { startDate: "2026-11-03", endDate: "2026-11-09" };

  it("accepts a filter body", () => {
    expect(
      eventLedgerTagSchema.safeParse({ filter: { ...filter, accountId: "a1" }, tagIds: ["t1"] }).success
    ).toBe(true);
  });

  it("rejects a filter missing a date", () => {
    expect(
      eventLedgerTagSchema.safeParse({ filter: { startDate: "2026-11-03" }, tagIds: ["t1"] }).success
    ).toBe(false);
    expect(
      eventLedgerTagSchema.safeParse({ filter: { endDate: "2026-11-09" }, tagIds: ["t1"] }).success
    ).toBe(false);
  });

  it("rejects a reversed filter", () => {
    expect(
      eventLedgerTagSchema.safeParse({
        filter: { startDate: "2026-11-09", endDate: "2026-11-03" },
        tagIds: ["t1"],
      }).success
    ).toBe(false);
  });

  it("rejects more than 10 tags or none", () => {
    expect(
      eventLedgerTagSchema.safeParse({
        filter,
        tagIds: Array.from({ length: 11 }, (_, i) => `t${i}`),
      }).success
    ).toBe(false);
    expect(eventLedgerTagSchema.safeParse({ filter, tagIds: [] }).success).toBe(false);
  });
});

describe("eventLedgerFormSchema - modes", () => {
  it("tag mode requires a tag", () => {
    const r = eventLedgerFormSchema.safeParse({ mode: "tag", tagIds: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Select at least one tag");
  });

  it("range mode passes without tags when both dates are set", () => {
    expect(
      eventLedgerFormSchema.safeParse({
        mode: "range",
        tagIds: [],
        startDate: new Date(2026, 10, 3),
        endDate: new Date(2026, 10, 9),
      }).success
    ).toBe(true);
  });

  it("range mode requires both dates", () => {
    const r = eventLedgerFormSchema.safeParse({ mode: "range", tagIds: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.map((i) => i.message)).toEqual([
        "Select a start date",
        "Select an end date",
      ]);
    }
  });

  it.each(["tag", "range"] as const)("%s mode flags a reversed range on endDate", (mode) => {
    const r = eventLedgerFormSchema.safeParse({
      mode,
      tagIds: ["t1"],
      startDate: new Date(2026, 10, 9),
      endDate: new Date(2026, 10, 3),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.path[0] === "endDate");
      expect(issue?.message).toBe("End date cannot be before start date");
    }
  });

  it("rejects an unknown mode", () => {
    expect(eventLedgerFormSchema.safeParse({ mode: "x", tagIds: ["t1"] }).success).toBe(false);
  });
});
