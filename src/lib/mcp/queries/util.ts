/** Prisma Decimal (or null) to a plain number. */
export function toNumber(value: { toString(): string } | null | undefined): number {
  return value == null ? 0 : parseFloat(value.toString());
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Fraction (e.g. 0.2534) rounded to 4 decimals, or null when the denominator is 0. */
export function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 10000;
}
