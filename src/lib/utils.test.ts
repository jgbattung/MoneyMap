import { describe, it, expect } from 'vitest'
import { cn, capitalizeFirstLetter, getOrdinalSuffix, calculateAssetCategories, formatDateForAPI } from './utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('deduplicates Tailwind classes (last wins)', () => {
    const result = cn('px-4', 'px-8')
    expect(result).toBe('px-8')
  })

  it('handles undefined/null/empty values', () => {
    expect(cn(undefined, null, '', 'valid')).toBe('valid')
  })
})

describe('capitalizeFirstLetter', () => {
  it('capitalizes first letter and lowercases rest', () => {
    expect(capitalizeFirstLetter('hello')).toBe('Hello')
    expect(capitalizeFirstLetter('WORLD')).toBe('World')
    expect(capitalizeFirstLetter('fOoBaR')).toBe('Foobar')
  })

  it('returns empty string for empty input', () => {
    expect(capitalizeFirstLetter('')).toBe('')
  })

  it('handles single character strings', () => {
    expect(capitalizeFirstLetter('a')).toBe('A')
    expect(capitalizeFirstLetter('Z')).toBe('Z')
  })
})

describe('getOrdinalSuffix', () => {
  it('returns "th" for 11, 12, 13', () => {
    expect(getOrdinalSuffix(11)).toBe('th')
    expect(getOrdinalSuffix(12)).toBe('th')
    expect(getOrdinalSuffix(13)).toBe('th')
  })

  it('returns "st" for 1, 21, 31', () => {
    expect(getOrdinalSuffix(1)).toBe('st')
    expect(getOrdinalSuffix(21)).toBe('st')
    expect(getOrdinalSuffix(31)).toBe('st')
  })

  it('returns "nd" for 2, 22', () => {
    expect(getOrdinalSuffix(2)).toBe('nd')
    expect(getOrdinalSuffix(22)).toBe('nd')
  })

  it('returns "rd" for 3, 23', () => {
    expect(getOrdinalSuffix(3)).toBe('rd')
    expect(getOrdinalSuffix(23)).toBe('rd')
  })

  it('returns "th" for other numbers', () => {
    expect(getOrdinalSuffix(4)).toBe('th')
    expect(getOrdinalSuffix(10)).toBe('th')
    expect(getOrdinalSuffix(20)).toBe('th')
  })
})

describe('calculateAssetCategories', () => {
  it('returns empty array when no accounts', () => {
    expect(calculateAssetCategories([])).toEqual([])
  })

  it('returns empty array when no accounts contribute to net worth', () => {
    const accounts = [
      { accountType: 'CHECKING', currentBalance: 1000, addToNetWorth: false },
    ]
    expect(calculateAssetCategories(accounts)).toEqual([])
  })

  it('excludes CREDIT_CARD accounts even if addToNetWorth is true', () => {
    const accounts = [
      { accountType: 'CREDIT_CARD', currentBalance: 500, addToNetWorth: true },
      { accountType: 'CHECKING', currentBalance: 1000, addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Checking')
  })

  it('correctly calculates percentages for multiple categories', () => {
    const accounts = [
      { accountType: 'CHECKING', currentBalance: 500, addToNetWorth: true },
      { accountType: 'SAVINGS', currentBalance: 1500, addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result).toHaveLength(2)
    // SAVINGS is 75%, CHECKING is 25%; sorted by percentage desc
    expect(result[0].name).toBe('Savings')
    expect(result[0].percentage).toBe(75)
    expect(result[1].name).toBe('Checking')
    expect(result[1].percentage).toBe(25)
  })

  it('aggregates balances for same account type', () => {
    const accounts = [
      { accountType: 'CHECKING', currentBalance: 300, addToNetWorth: true },
      { accountType: 'CHECKING', currentBalance: 700, addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(1000)
    expect(result[0].percentage).toBe(100)
  })

  it('handles string balances by parsing them', () => {
    const accounts = [
      { accountType: 'SAVINGS', currentBalance: '2500.50', addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(2500.50)
  })

  it('filters out categories with zero or negative balance', () => {
    const accounts = [
      { accountType: 'CHECKING', currentBalance: 0, addToNetWorth: true },
      { accountType: 'SAVINGS', currentBalance: 1000, addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Savings')
  })

  it('returns correct color for known account types', () => {
    const accounts = [
      { accountType: 'CHECKING', currentBalance: 1000, addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result[0].color).toBe('var(--chart-1)')
  })

  it('returns fallback color for unknown account types', () => {
    const accounts = [
      { accountType: 'UNKNOWN_TYPE', currentBalance: 1000, addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result[0].color).toBe('var(--chart-1)')
  })

  it('handles single account with 100% correctly', () => {
    const accounts = [
      { accountType: 'INVESTMENT', currentBalance: 5000, addToNetWorth: true },
    ]
    const result = calculateAssetCategories(accounts)
    expect(result).toHaveLength(1)
    expect(result[0].percentage).toBe(100)
    expect(result[0].value).toBe(5000)
  })
})

describe('formatDateForAPI', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 15) // Jan 15, 2024
    expect(formatDateForAPI(date)).toBe('2024-01-15')
  })

  it('pads month and day with leading zeros', () => {
    const date = new Date(2024, 8, 5) // Sep 5, 2024
    expect(formatDateForAPI(date)).toBe('2024-09-05')
  })

  it('handles December (month 11)', () => {
    const date = new Date(2024, 11, 31) // Dec 31, 2024
    expect(formatDateForAPI(date)).toBe('2024-12-31')
  })

  it('handles year boundary correctly', () => {
    const date = new Date(2025, 0, 1) // Jan 1, 2025
    expect(formatDateForAPI(date)).toBe('2025-01-01')
  })
})
