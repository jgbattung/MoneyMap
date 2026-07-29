import { describe, it, expect } from "vitest";
import { calendarSummaryQuerySchema, calendarDayQuerySchema } from "../calendar";

describe("calendarSummaryQuerySchema", () => {
  it("accepts a full 31-day month", () => {
    const result = calendarSummaryQuerySchema.safeParse({
      start: "2026-07-01",
      end: "2026-07-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date", () => {
    const result = calendarSummaryQuerySchema.safeParse({
      start: "07-01-2026",
      end: "2026-07-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid calendar date", () => {
    const result = calendarSummaryQuerySchema.safeParse({
      start: "2026-13-40",
      end: "2026-13-41",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an inverted range (end before start)", () => {
    const result = calendarSummaryQuerySchema.safeParse({
      start: "2026-07-31",
      end: "2026-07-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a range longer than 62 days", () => {
    const result = calendarSummaryQuerySchema.safeParse({
      start: "2026-01-01",
      end: "2026-04-01", // ~90 days
    });
    expect(result.success).toBe(false);
  });

  it("accepts a range of exactly 62 days", () => {
    const result = calendarSummaryQuerySchema.safeParse({
      start: "2026-01-01",
      end: "2026-03-04", // 62 days
    });
    expect(result.success).toBe(true);
  });

  it("accepts start === end (single day range)", () => {
    const result = calendarSummaryQuerySchema.safeParse({
      start: "2026-07-29",
      end: "2026-07-29",
    });
    expect(result.success).toBe(true);
  });
});

describe("calendarDayQuerySchema", () => {
  it("accepts a valid date", () => {
    const result = calendarDayQuerySchema.safeParse({ date: "2026-07-29" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date", () => {
    const result = calendarDayQuerySchema.safeParse({ date: "2026/07/29" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing date", () => {
    const result = calendarDayQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
