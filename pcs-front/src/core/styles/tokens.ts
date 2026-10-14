/**
 * Design Token 的 TypeScript 常量映射 —— 由 scripts/gen-tokens.mjs 自动生成，禁止手改。
 *
 * 唯一值源：src/core/styles/tokens.css（CSS 自定义属性）。改任何数值请改 tokens.css，
 * 然后运行 `npm run gen:tokens` 重新生成；`npm run check:tokens`（已挂入 gate）检测漂移。
 */

/* ============================================================
 * 语义色（success / warning / error / info，各含主色与浅底 bg 等）
 * ============================================================ */
export const SEMANTIC_COLORS = {
  success: '#18a058',
  successBg: '#e6f5ee',
  successBorder: 'rgba(24, 160, 88, 0.2)',
  successToastBorder: 'rgba(24, 160, 88, 0.3)',
  warning: '#e87d13',
  warningBg: '#fff7e6',
  warningBorder: 'rgba(232, 125, 19, 0.2)',
  warningToastBorder: 'rgba(232, 125, 19, 0.3)',
  error: '#e24b4a',
  errorBg: '#fdecec',
  errorBorder: 'rgba(226, 75, 74, 0.2)',
  errorToastBorder: 'rgba(226, 75, 74, 0.3)',
  info: '#046efc',
  infoBg: '#ebf3fd',
  infoBorder: 'rgba(4, 110, 252, 0.2)',
  infoToastBorder: 'rgba(4, 110, 252, 0.3)',
  neutralTagBorder: 'rgba(75, 85, 100, 0.2)',
} as const

/* ============================================================
 * 业务标识色（7 类，各含主色与浅底 bg）
 * ============================================================ */
export const BIZ_COLORS = {
  express: { color: '#046efc', bg: '#ebf3fd' },
  air: { color: '#5b4fcf', bg: '#edeaff' },
  fba: { color: '#d4610a', bg: '#fff0e6' },
  line: { color: '#c4364a', bg: '#fdeef0' },
  sea: { color: '#0a8c8c', bg: '#e6f6f6' },
  pickup: { color: '#5b4fcf', bg: '#edeaff' },
  inquiry: { color: '#d4610a', bg: '#fff0e6' },
} as const

/* ============================================================
 * z-index 层级全套（禁止业务代码写裸数字，一律引用此处或 CSS 的 --z-*）
 * ============================================================ */
export const Z_INDEX = {
  base: 0,
  tableSticky: 10,
  stickyBar: 20,
  header: 100,
  sidebar: 110,
  sidebarFlyout: 300,
  dropdown: 500,
  popover: 600,
  tooltip: 700,
  aiEntry: 800,
  aiPanel: 900,
  drawerMask: 1200,
  drawer: 1210,
  modalMask: 1400,
  modal: 1410,
  toast: 1800,
  globalLoading: 2000,
} as const

/* ============================================================
 * 通用数据可视化色板（值取自 tokens.css；字段语义挑选与数组顺序见 gen-tokens.mjs 映射）
 *   - 不绑定 ECharts，可给任意图表/数据可视化消费
 * ============================================================ */
export const DATA_VIZ_COLORS = {
  primaryScale: ['#0242a8', '#046efc', '#5b9cf5', '#a9d3ff', '#d1e4fb', '#ebf3fd'],
  primary: '#046efc',
  axisLabel: '#4b5564',
  axisLine: '#dddddd',
  splitLine: '#dddddd',
} as const

/**
 * @deprecated 1.x 兼容别名：请改用 DATA_VIZ_COLORS（通用数据可视化 token）；2.0 删除。
 */
export const CHART_COLORS = DATA_VIZ_COLORS

/* ============================================================
 * 类型导出
 * ============================================================ */
export type BizType = keyof typeof BIZ_COLORS
export type SemanticColorKey = keyof typeof SEMANTIC_COLORS
export type ZIndexKey = keyof typeof Z_INDEX

export interface BizColor {
  /** 主色（文字/图标/边框语义色） */
  color: string
  /** 浅色背景（标签底色） */
  bg: string
}

/**
 * 按业务类型取标识色（主色 + 浅底 bg）。
 * 供业务标签、图表分类配色等按 key 取色，避免散落硬编码。
 * @param type 业务类型 key（express/air/fba/line/sea/pickup/inquiry）
 */
export function getBizColor(type: BizType): BizColor {
  return BIZ_COLORS[type]
}
