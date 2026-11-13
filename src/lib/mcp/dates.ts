import { z } from "zod";

const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
const MAX_WINDOW_MONTHS = 24;
const DEFAULT_WINDOW_MONTHS = 6;

/** Month string as exchanged with MCP clients: `YYYY-MM`. */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Expected a month in YYYY-MM format");

/**
 * "Now" in Philippine time. The returned Date is shifted by +8h, so read it with the
 * UTC getters (same idiom as `src/app/api/cron/process-statements/route.ts`).
 */
export function phToday(): Date {
  return new Date(Date.now() + PH_OFFSET_MS);
}

export function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function currentPhMonth(): string {
  return monthKey(phToday());
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  monthSchema.parse(month);
  return { year: Number(month.slice(0, 4)), monthIndex: Number(month.slice(5, 7)) - 1 };
}

/** Shifts a `YYYY-MM` month by `delta` months (negative goes back). */
export function addMonths(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month);
  return monthKey(new Date(Date.UTC(year, monthIndex + delta, 1)));
}

/**
 * Half-open UTC range covering a calendar month. Transaction dates are stored as UTC
 * midnight of the PH calendar date (or a real timestamp on that UTC day), so compare
 * with `gte` / `lt`.
 */
export function monthRange(month: string): { gte: Date; lt: Date } {
  const { year, monthIndex } = parseMonth(month);
  return {
    gte: new Date(Date.UTC(year, monthIndex, 1)),
    lt: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

export function daysInMonth(month: string): number {
  const { year, monthIndex } = parseMonth(month);
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Inclusive list of months from `from` to `to`, oldest first. A window longer than 24
 * months keeps the 24 most recent. Returns [] when `from` is after `to`.
 */
export function monthsBetween(from: string, to: string): string[] {
  const start = parseMonth(from);
  const end = parseMonth(to);
  const total = (end.year - start.year) * 12 + (end.monthIndex - start.monthIndex) + 1;
  if (total < 1) return [];

  const count = Math.min(total, MAX_WINDOW_MONTHS);
  const first = addMonths(to, -(count - 1));
  return Array.from({ length: count }, (_, i) => addMonths(first, i));
}

/** Last 6 months including the current PH month. */
export function defaultWindow(): { from: string; to: string } {
  const to = currentPhMonth();
  return { from: addMonths(to, -(DEFAULT_WINDOW_MONTHS - 1)), to };
}

/**
 * Resolves optional `from` / `to` tool args into a capped, ordered month list and the
 * UTC range that spans it.
 */
export function resolveWindow(args: { from?: string; to?: string }): {
  months: string[];
  from: string;
  to: string;
  range: { gte: Date; lt: Date };
} {
  const to = args.to ?? currentPhMonth();
  const from = args.from ?? addMonths(to, -(DEFAULT_WINDOW_MONTHS - 1));
  const months = monthsBetween(from, to);
  if (months.length === 0) throw new Error("`from` must not be after `to`");

  const first = months[0];
  const last = months[months.length - 1];
  return {
    months,
    from: first,
    to: last,
    range: { gte: monthRange(first).gte, lt: monthRange(last).lt },
  };
}
