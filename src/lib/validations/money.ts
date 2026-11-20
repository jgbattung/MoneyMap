const MONEY = /^(\d+(\.\d{0,2})?|\.\d{1,2})$/;
const SIGNED_MONEY = /^-?(\d+(\.\d{0,2})?|\.\d{1,2})$/;

export function isMoneyString(
  value: string,
  opts?: { allowNegative?: boolean }
): boolean {
  return (opts?.allowNegative ? SIGNED_MONEY : MONEY).test(value);
}

export const MONEY_MESSAGE = (label: string): string =>
  `${label} must be a number with at most 2 decimals`;
