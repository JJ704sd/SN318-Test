/**
 * 数据格式化工具（实施方案任务 1.7 / 规范 §09 数据展示、§08 文案）
 *
 * 纯函数集合，供表格、详情、表单、图表 tooltip 等全项目统一调用，
 * 杜绝各页面各写各的格式。所有函数遇空值（null/undefined/空串/NaN）统一返回 EMPTY_TEXT（`-`）。
 *
 * 规范要点：
 *   - 金额保留 4 位小数（非 2 位），货币符号与数字间 1 个空格：`¥ 1,234.5600`
 *   - 时间统一 `YYYY-MM-DD HH:mm`，禁止斜杠分隔、禁止 12 小时制
 *   - 空值一律 `-`（数字列空值的右对齐由表格列配置处理，函数只回 `-`）
 *
 * 与 valueFormat.ts 的关系：
 *   - 本文件是「具体格式化函数」（formatMoney / formatWeight / ...），按字段调用
 *   - valueFormat.ts 是「按 ValueType 枚举分发的薄壳」，用于表格列等"按字段类型动态选格式化函数"的场景，
 *     内部仍委托回本文件的函数。两文件职责不重叠，禁止合并
 */
import dayjs from 'dayjs'
import { EMPTY_TEXT } from './constants'

/** 可被格式化的数值输入（含空值分支）*/
type NumericInput = number | string | null | undefined
/** 可被格式化的时间输入 */
type DateInput = number | string | Date | null | undefined

/** 判定是否为空值：null / undefined / 空串 / 非有限数 */
function isEmptyNumber(v: NumericInput): boolean {
  if (v === null || v === undefined || v === '') return true
  return !Number.isFinite(Number(v))
}

/**
 * 千分位 + 固定小数位。仅供内部复用。
 * @param v 数值
 * @param digits 小数位数（固定，不足补 0）
 */
function toFixedGrouped(v: number, digits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v)
}

/**
 * 金额：千分位 + 保留 4 位小数 + 货币符号与数字间 1 空格。
 * 示例：formatMoney(1234.56) -> `¥ 1,234.5600`
 * @param v 金额数值
 * @param options.currency 货币符号，默认 `¥`
 * @param options.digits 小数位，默认 4
 */
export function formatMoney(
  v: NumericInput,
  options: { currency?: string; digits?: number } = {},
): string {
  if (isEmptyNumber(v)) return EMPTY_TEXT
  const { currency = '¥', digits = 4 } = options
  return `${currency} ${toFixedGrouped(Number(v), digits)}`
}

/**
 * 重量：保留 3 位小数 + `KG`。
 * 示例：formatWeight(12.5) -> `12.500 KG`
 */
export function formatWeight(v: NumericInput): string {
  if (isEmptyNumber(v)) return EMPTY_TEXT
  return `${toFixedGrouped(Number(v), 3)} KG`
}

/**
 * 件数：千分位整数 + 可选后缀 `件`。
 * 示例：formatCount(1200) -> `1,200 件`；formatCount(1200, false) -> `1,200`
 * @param v 件数
 * @param withSuffix 是否附加 `件` 后缀，默认 true
 */
export function formatCount(v: NumericInput, withSuffix = true): string {
  if (isEmptyNumber(v)) return EMPTY_TEXT
  const num = toFixedGrouped(Number(v), 0)
  return withSuffix ? `${num} 件` : num
}

/**
 * 百分比：保留 2 位小数 + `%`。传入的是百分数值本身（98.5 -> `98.50%`），非比率。
 * 示例：formatPercent(98.5) -> `98.50%`
 */
export function formatPercent(v: NumericInput): string {
  if (isEmptyNumber(v)) return EMPTY_TEXT
  return `${toFixedGrouped(Number(v), 2)}%`
}

/**
 * 体积：保留 4 位小数 + `CBM`。
 * 示例：formatVolume(0.024) -> `0.0240 CBM`
 */
export function formatVolume(v: NumericInput): string {
  if (isEmptyNumber(v)) return EMPTY_TEXT
  return `${toFixedGrouped(Number(v), 4)} CBM`
}

/**
 * 日期时间：`YYYY-MM-DD HH:mm`（24 小时制，短横线分隔，禁斜杠/12 小时制）。
 * 常态数据（表格、详情）的默认时间格式。
 */
export function formatDateTime(v: DateInput): string {
  if (v === null || v === undefined || v === '') return EMPTY_TEXT
  const d = dayjs(v)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : EMPTY_TEXT
}

/**
 * 仅日期：`YYYY-MM-DD`。
 */
export function formatDate(v: DateInput): string {
  if (v === null || v === undefined || v === '') return EMPTY_TEXT
  const d = dayjs(v)
  return d.isValid() ? d.format('YYYY-MM-DD') : EMPTY_TEXT
}

/**
 * 秒级日期时间：`YYYY-MM-DD HH:mm:ss`。
 */
export function formatDateTimeSec(v: DateInput): string {
  if (v === null || v === undefined || v === '') return EMPTY_TEXT
  const d = dayjs(v)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : EMPTY_TEXT
}

/**
 * 相对时间（如「3 分钟前」）。
 *
 * ⚠️ 使用边界：仅用于消息、通知、日志、动态流等**时效性内容**。
 * 禁止用于表格列、详情页字段等**常态数据** -- 这些场景一律用 formatDateTime / formatDate
 * 的绝对时间（规范 §09 默认时间格式为 `YYYY-MM-DD HH:mm`）。
 * 原因：相对时间随刷新变化，不利于数据比对与追溯。
 */
export function formatRelative(v: DateInput): string {
  if (v === null || v === undefined || v === '') return EMPTY_TEXT
  const d = dayjs(v)
  if (!d.isValid()) return EMPTY_TEXT

  const diffSec = dayjs().diff(d, 'second')
  const future = diffSec < 0
  const abs = Math.abs(diffSec)
  const suffix = future ? '后' : '前'

  if (abs < 60) return future ? '即将' : '刚刚'
  const min = Math.floor(abs / 60)
  if (min < 60) return `${min} 分钟${suffix}`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时${suffix}`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day} 天${suffix}`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} 个月${suffix}`
  const year = Math.floor(month / 12)
  return `${year} 年${suffix}`
}
