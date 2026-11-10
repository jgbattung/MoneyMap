import { describe, it, expect, afterEach } from "vitest";
import { buildDateRange, dateOnlySchema } from "../report-date-range";

describe("buildDateRange", () => {
  it("returns an inclusive start and exclusive day-after end", () => {
    const r = buildDateRange("2026-11-03", "2026-11-09");
    expect(r?.gte?.toISOString()).toBe("2026-11-03T00:00:00.000Z");
    expect(r?.lt?.toISOString()).toBe("2026-11-10T00:00:00.000Z");
  });

  it("handles start only", () => {
    const r = buildDateRange("2026-11-03", undefined);
    expect(r?.gte?.toISOString()).toBe("2026-11-03T00:00:00.000Z");
    expect(r).not.toHaveProperty("lt");
  });

  it("handles end only", () => {
    const r = buildDateRange(undefined, "2026-11-09");
    expect(r?.lt?.toISOString()).toBe("2026-11-10T00:00:00.000Z");
    expect(r).not.toHaveProperty("gte");
  });

  it("returns undefined when neither is given", () => {
    expect(buildDateRange()).toBeUndefined();
    expect(buildDateRange(undefined, undefined)).toBeUndefined();
  });

  it("rolls over month and year boundaries", () => {
    expect(buildDateRange(undefined, "2026-12-31")?.lt?.toISOString()).toBe(
      "2027-01-01T00:00:00.000Z"
    );
    expect(buildDateRange(undefined, "2026-02-28")?.lt?.toISOString()).toBe(
      "2026-03-01T00:00:00.000Z"
    );
  });

  describe("timezone independence", () => {
    const original = process.env.TZ;
    afterEach(() => {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    });

    it.each(["UTC", "Asia/Manila", "America/Los_Angeles"])(
      "gives identical bounds under TZ=%s",
      (tz) => {
        process.env.TZ = tz;
        const r = buildDateRange("2026-11-03", "2026-11-09");
        expect(r?.gte?.toISOString()).toBe("2026-11-03T00:00:00.000Z");
        expect(r?.lt?.toISOString()).toBe("2026-11-10T00:00:00.000Z");
      }
    );
  });

  it("includes UTC-midnight and cron-shaped rows on the end day, excludes the next day", () => {
    const { lt } = buildDateRange(undefined, "2026-11-09")!;
    expect(new Date("2026-11-09T00:00:00.000Z") < lt!).toBe(true);
    expect(new Date("2026-11-09T00:03:00.000Z") < lt!).toBe(true);
    expect(new Date("2026-11-10T00:00:00.000Z") < lt!).toBe(false);
  });
});

describe("dateOnlySchema", () => {
  it("accepts YYYY-MM-DD and rejects ISO timestamps", () => {
    expect(dateOnlySchema.safeParse("2026-11-09").success).toBe(true);
    expect(dateOnlySchema.safeParse("2026-11-09T00:00:00.000Z").success).toBe(false);
    expect(dateOnlySchema.safeParse("11/09/2026").success).toBe(false);
  });
});
