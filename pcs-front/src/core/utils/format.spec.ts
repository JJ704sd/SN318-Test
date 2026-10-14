import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import {
  formatMoney,
  formatWeight,
  formatCount,
  formatPercent,
  formatVolume,
  formatDateTime,
  formatDate,
  formatDateTimeSec,
  formatRelative,
} from './format'
import { EMPTY_TEXT } from './constants'

describe('formatMoney', () => {
  it('千分位 + 4 位小数 + 货币符号后 1 空格', () => {
    expect(formatMoney(1234.56)).toBe('¥ 1,234.5600')
    expect(formatMoney(0)).toBe('¥ 0.0000')
    expect(formatMoney(1000000)).toBe('¥ 1,000,000.0000')
  })
  it('支持自定义币种与小数位', () => {
    expect(formatMoney(1234.5, { currency: '$', digits: 2 })).toBe('$ 1,234.50')
  })
  it('空值返回 —', () => {
    expect(formatMoney(null)).toBe(EMPTY_TEXT)
    expect(formatMoney(undefined)).toBe(EMPTY_TEXT)
    expect(formatMoney('')).toBe(EMPTY_TEXT)
    expect(formatMoney('abc')).toBe(EMPTY_TEXT)
  })
})

describe('formatWeight', () => {
  it('3 位小数 + KG', () => {
    expect(formatWeight(12.5)).toBe('12.500 KG')
    expect(formatWeight(0)).toBe('0.000 KG')
  })
  it('空值返回 —', () => {
    expect(formatWeight(null)).toBe(EMPTY_TEXT)
  })
})

describe('formatCount', () => {
  it('千分位整数 + 件后缀', () => {
    expect(formatCount(1200)).toBe('1,200 件')
  })
  it('可关闭后缀', () => {
    expect(formatCount(1200, false)).toBe('1,200')
  })
  it('空值返回 —', () => {
    expect(formatCount(undefined)).toBe(EMPTY_TEXT)
  })
})

describe('formatPercent', () => {
  it('2 位小数 + %', () => {
    expect(formatPercent(98.5)).toBe('98.50%')
    expect(formatPercent(0)).toBe('0.00%')
  })
  it('空值返回 —', () => {
    expect(formatPercent(null)).toBe(EMPTY_TEXT)
  })
})

describe('formatVolume', () => {
  it('4 位小数 + CBM', () => {
    expect(formatVolume(0.024)).toBe('0.0240 CBM')
  })
  it('空值返回 —', () => {
    expect(formatVolume('')).toBe(EMPTY_TEXT)
  })
})

describe('日期时间格式化', () => {
  const sample = '2026-07-17 09:05:30'

  it('formatDateTime → YYYY-MM-DD HH:mm（无斜杠、24 小时制）', () => {
    expect(formatDateTime(sample)).toBe('2026-07-17 09:05')
    expect(formatDateTime(sample)).not.toContain('/')
  })
  it('formatDate → YYYY-MM-DD', () => {
    expect(formatDate(sample)).toBe('2026-07-17')
  })
  it('formatDateTimeSec → YYYY-MM-DD HH:mm:ss', () => {
    expect(formatDateTimeSec(sample)).toBe('2026-07-17 09:05:30')
  })
  it('下午时间为 24 小时制', () => {
    expect(formatDateTime('2026-07-17 15:30:00')).toBe('2026-07-17 15:30')
  })
  it('空值/非法日期返回 —', () => {
    expect(formatDateTime(null)).toBe(EMPTY_TEXT)
    expect(formatDateTime('not-a-date')).toBe(EMPTY_TEXT)
    expect(formatDate(undefined)).toBe(EMPTY_TEXT)
    expect(formatDateTimeSec('')).toBe(EMPTY_TEXT)
  })
})

describe('formatRelative', () => {
  // 用秒级偏移并留足余量，避免执行耗时跨过分钟/小时边界导致偶发失败
  it('刚刚 / 分钟 / 小时 / 天', () => {
    expect(formatRelative(dayjs().subtract(30, 'second').toISOString())).toBe('刚刚')
    expect(formatRelative(dayjs().subtract(200, 'second').toISOString())).toBe('3 分钟前')
    expect(formatRelative(dayjs().subtract(7000, 'second').toISOString())).toBe('1 小时前')
    expect(formatRelative(dayjs().subtract(5, 'day').toISOString())).toBe('5 天前')
  })
  it('未来时间带「后」', () => {
    expect(formatRelative(dayjs().add(200, 'second').toISOString())).toBe('3 分钟后')
  })
  it('空值/非法返回 —', () => {
    expect(formatRelative(null)).toBe(EMPTY_TEXT)
    expect(formatRelative('bad')).toBe(EMPTY_TEXT)
  })
})
