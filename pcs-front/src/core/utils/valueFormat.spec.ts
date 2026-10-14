import { describe, expect, it, vi } from 'vitest'

const { formatMoney, formatWeight, formatCount, formatPercent, formatVolume } = vi.hoisted(() => ({
  formatMoney: vi.fn<(v: number) => string>(() => 'M'),
  formatWeight: vi.fn<(v: number) => string>(() => 'W'),
  formatCount: vi.fn<(v: number) => string>(() => 'C'),
  formatPercent: vi.fn<(v: number) => string>(() => 'P'),
  formatVolume: vi.fn<(v: number) => string>(() => 'V'),
}))

vi.mock('./format', () => ({ formatMoney, formatWeight, formatCount, formatPercent, formatVolume }))

import { formatByValueType, isNumericValueType } from './valueFormat'

describe('valueFormat', () => {
  it('isNumericValueType 对数值类型为 true', () => {
    expect(['money', 'weight', 'count', 'percent', 'volume'].every(isNumericValueType)).toBe(true)
    expect(isNumericValueType('foo' as never)).toBe(false)
  })

  it('空值（null/undefined/空串）返回 -', () => {
    expect(formatByValueType('money', null)).toBe('-')
    expect(formatByValueType(undefined, undefined)).toBe('-')
    expect(formatByValueType('money', '')).toBe('-')
  })

  it('无类型时返回 String 化结果', () => {
    expect(formatByValueType(undefined, 123)).toBe('123')
    expect(formatByValueType(undefined, { a: 1 })).toBe('[object Object]')
  })

  it('按类型分发到对应 formatter', () => {
    expect(formatByValueType('money', 100)).toBe('M')
    expect(formatMoney).toHaveBeenCalledWith(100)
    expect(formatByValueType('weight', 5)).toBe('W')
    expect(formatByValueType('count', 3)).toBe('C')
    expect(formatByValueType('percent', 0.5)).toBe('P')
    expect(formatByValueType('volume', 2)).toBe('V')
  })
})
