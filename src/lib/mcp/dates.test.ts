import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  addMonths,
  currentPhMonth,
  daysInMonth,
  defaultWindow,
  monthKey,
  monthRange,
  monthSchema,
  monthsBetween,
  phToday,
  resolveWindow,
} from './dates'

afterEach(() => {
  vi.useRealTimers()
})

describe('phToday / currentPhMonth', () => {
  it('is still the last day of the month at 15:59 UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T15:59:00Z'))
    expect(currentPhMonth()).toBe('2026-03')
    expect(phToday().getUTCDate()).toBe(31)
  })

  it('rolls over to the next month at 16:00 UTC on the last day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-31T16:00:00Z'))
    expect(currentPhMonth()).toBe('2026-04')
    expect(phToday().getUTCDate()).toBe(1)
  })

  it('rolls over the year at 16:00 UTC on Dec 31', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T16:00:00Z'))
    expect(currentPhMonth()).toBe('2027-01')
  })
})

describe('monthRange', () => {
  it('returns the half-open UTC range for a normal month', () => {
    const r = monthRange('2026-02')
    expect(r.gte.toISOString()).toBe('2026-02-01T00:00:00.000Z')
    expect(r.lt.toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })

  it('crosses the year boundary for December', () => {
    const r = monthRange('2026-12')
    expect(r.gte.toISOString()).toBe('2026-12-01T00:00:00.000Z')
    expect(r.lt.toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })

  it('rejects an invalid month', () => {
    expect(() => monthRange('2026-13')).toThrow()
  })
})

describe('daysInMonth / addMonths / monthKey', () => {
  it('handles February in a non-leap and a leap year', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysInMonth('2026-04')).toBe(30)
  })

  it('shifts across year boundaries in both directions', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-03', -14)).toBe('2025-01')
  })

  it('keys a cron timestamp by its UTC month', () => {
    expect(monthKey(new Date('2026-03-31T00:05:00Z'))).toBe('2026-03')
  })
})

describe('monthsBetween', () => {
  it('is inclusive and oldest first across a year boundary', () => {
    expect(monthsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('returns a single month when from equals to', () => {
    expect(monthsBetween('2026-05', '2026-05')).toEqual(['2026-05'])
  })

  it('caps at 24 months keeping the most recent', () => {
    const months = monthsBetween('2020-01', '2026-06')
    expect(months).toHaveLength(24)
    expect(months[23]).toBe('2026-06')
    expect(months[0]).toBe('2024-07')
  })

  it('returns an empty list when from is after to', () => {
    expect(monthsBetween('2026-06', '2026-01')).toEqual([])
  })
})

describe('defaultWindow / resolveWindow', () => {
  it('is the last 6 months including the current PH month', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T00:00:00Z'))
    expect(defaultWindow()).toEqual({ from: '2025-10', to: '2026-03' })
  })

  it('resolves a range spanning the window', () => {
    const w = resolveWindow({ from: '2026-01', to: '2026-03' })
    expect(w.months).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(w.range.gte.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(w.range.lt.toISOString()).toBe('2026-04-01T00:00:00.000Z')
  })

  it('defaults from to 5 months before to', () => {
    expect(resolveWindow({ to: '2026-06' }).months).toEqual([
      '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    ])
  })

  it('throws when from is after to', () => {
    expect(() => resolveWindow({ from: '2026-05', to: '2026-01' })).toThrow()
  })
})

describe('monthSchema', () => {
  it('accepts valid months', () => {
    expect(monthSchema.safeParse('2026-01').success).toBe(true)
    expect(monthSchema.safeParse('2026-12').success).toBe(true)
  })

  it.each(['2026-13', '2026-00', '2026-1', '26-01', '2026/01', '2026-01-01', ''])(
    'rejects %s',
    (v) => {
      expect(monthSchema.safeParse(v).success).toBe(false)
    }
  )
})
