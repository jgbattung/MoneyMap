/** "34495." -> "34495", ".5" -> "0.5". Returns the input unchanged when it is not a plain number. */
export function normalizeAmount(raw: string): string {
  if (!/^\d*\.?\d*$/.test(raw)) return raw
  let value = raw.endsWith(".") ? raw.slice(0, -1) : raw
  if (value.startsWith(".")) value = `0${value}`
  return value
}

/** Parses the date part of an ISO string as a local date, so the day never shifts by timezone. */
export function localDateFromIso(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** True for a positive amount with at most 2 decimals. */
export function isValidMoney(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0
}
