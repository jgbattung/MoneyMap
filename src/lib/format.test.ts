import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

describe('formatCurrency', () => {
  // Happy path — typical positive amounts
  it('formats a whole number with two decimal places', () => {
    const result = formatCurrency(1000);
    expect(result).toBe('1,000.00');
  });

  it('formats a decimal amount with two decimal places', () => {
    const result = formatCurrency(1234.5);
    expect(result).toBe('1,234.50');
  });

  it('formats an amount that already has two decimal places', () => {
    const result = formatCurrency(1234.56);
    expect(result).toBe('1,234.56');
  });

  it('formats a small amount less than 1,000', () => {
    const result = formatCurrency(500);
    expect(result).toBe('500.00');
  });

  it('formats a large amount with comma separators', () => {
    const result = formatCurrency(1000000);
    expect(result).toBe('1,000,000.00');
  });

  // Rounding
  it('rounds down when the third decimal is less than 5', () => {
    const result = formatCurrency(1.234);
    expect(result).toBe('1.23');
  });

  it('rounds up when the third decimal is 5 or greater', () => {
    const result = formatCurrency(1.235);
    expect(result).toBe('1.24');
  });

  it('rounds up when the third decimal is greater than 5', () => {
    const result = formatCurrency(1.999);
    expect(result).toBe('2.00');
  });

  // Zero
  it('formats zero as 0.00', () => {
    const result = formatCurrency(0);
    expect(result).toBe('0.00');
  });

  // Negative values
  it('formats a negative amount', () => {
    const result = formatCurrency(-500);
    expect(result).toBe('-500.00');
  });

  it('formats a negative amount with comma separators', () => {
    const result = formatCurrency(-1234.56);
    expect(result).toBe('-1,234.56');
  });

  // Return type
  it('always returns a string', () => {
    expect(typeof formatCurrency(100)).toBe('string');
    expect(typeof formatCurrency(0)).toBe('string');
    expect(typeof formatCurrency(-100)).toBe('string');
  });

  // Precision edge cases
  it('formats a very small non-zero amount', () => {
    const result = formatCurrency(0.01);
    expect(result).toBe('0.01');
  });

  it('formats a value with more than two decimal digits by rounding', () => {
    const result = formatCurrency(9.999);
    expect(result).toBe('10.00');
  });
});
