import {
  formatMoney,
  formatWeight,
  formatCount,
  formatPercent,
  formatVolume,
} from './format'

export type ValueType = 'money' | 'weight' | 'count' | 'percent' | 'volume'

const FORMATTERS: Record<ValueType, (v: unknown) => string> = {
  money: (v) => formatMoney(v as number),
  weight: (v) => formatWeight(v as number),
  count: (v) => formatCount(v as number),
  percent: (v) => formatPercent(v as number),
  volume: (v) => formatVolume(v as number),
}

const NUMERIC_VALUE_TYPES: ValueType[] = ['money', 'weight', 'count', 'percent', 'volume']

export function isNumericValueType(t: ValueType): boolean {
  return NUMERIC_VALUE_TYPES.includes(t)
}

export function formatByValueType(valueType: ValueType | undefined, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (valueType) return FORMATTERS[valueType](value)
  return String(value)
}
