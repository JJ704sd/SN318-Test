#!/usr/bin/env node
/**
 * 生成 src/core/styles/tokens.ts（唯一值源 = src/core/styles/tokens.css）。
 *
 * tokens.css 的 230 个 CSS 变量是唯一数值来源；本脚本按【显式字段映射】把 TS 侧
 * 需要的常量（SEMANTIC/BIZ/Z_INDEX/DATA_VIZ）从 :root 自定义属性取值生成 tokens.ts。
 * 语义挑选（如 axisLabel 实际取 --color-text-body）、数组顺序（primaryScale 深→浅）
 * 都在下方映射里显式编码，不靠命名约定或值反查。
 *
 * 用法：
 *   node scripts/gen-tokens.mjs             # 覆写 src/core/styles/tokens.ts
 *   node scripts/gen-tokens.mjs --check     # 只校验：不一致则非零退出（挂入 gate）
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import postcss from 'postcss'

const ROOT = process.cwd()
const CSS_FILE = join(ROOT, 'src/core/styles/tokens.css')
const TS_FILE = join(ROOT, 'src/core/styles/tokens.ts')

/** 显式字段映射：TS 常量名 -> CSS 自定义属性。 */
const SEMANTIC_MAP = {
  success: '--color-success',
  successBg: '--color-success-bg',
  successBorder: '--color-success-border',
  successToastBorder: '--color-success-toast-border',
  warning: '--color-warning',
  warningBg: '--color-warning-bg',
  warningBorder: '--color-warning-border',
  warningToastBorder: '--color-warning-toast-border',
  error: '--color-error',
  errorBg: '--color-error-bg',
  errorBorder: '--color-error-border',
  errorToastBorder: '--color-error-toast-border',
  info: '--color-info',
  infoBg: '--color-info-bg',
  infoBorder: '--color-info-border',
  infoToastBorder: '--color-info-toast-border',
  neutralTagBorder: '--color-neutral-tag-border',
}

const BIZ_KEYS = ['express', 'air', 'fba', 'line', 'sea', 'pickup', 'inquiry']

const Z_MAP = {
  base: '--z-base',
  tableSticky: '--z-table-sticky',
  stickyBar: '--z-sticky-bar',
  header: '--z-header',
  sidebar: '--z-sidebar',
  sidebarFlyout: '--z-sidebar-flyout',
  dropdown: '--z-dropdown',
  popover: '--z-popover',
  tooltip: '--z-tooltip',
  aiEntry: '--z-ai-entry',
  aiPanel: '--z-ai-panel',
  drawerMask: '--z-drawer-mask',
  drawer: '--z-drawer',
  modalMask: '--z-modal-mask',
  modal: '--z-modal',
  toast: '--z-toast',
  globalLoading: '--z-global-loading',
}

/** primaryScale 深→浅：显式列 CSS 变量顺序。 */
const DATA_VIZ_PRIMARY_SCALE = [
  '--color-primary-active',
  '--color-primary',
  '--color-primary-400',
  '--color-primary-200',
  '--color-primary-100',
  '--color-primary-50',
]

function parseVars() {
  const css = readFileSync(CSS_FILE, 'utf8')
  const root = postcss.parse(css)
  const vars = new Map()
  root.walkRules((rule) => {
    // 只取顶层 :root（媒体查询内的断点覆盖值不作为常量源）
    if (rule.selector !== ':root') return
    if (rule.parent?.type === 'atrule') return
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith('--')) vars.set(decl.prop, decl.value.trim())
    })
  })
  return vars
}

function take(vars, name) {
  if (!vars.has(name)) {
    throw new Error(`[gen-tokens] tokens.css 缺少 CSS 变量 ${name}，请检查映射或 tokens.css`)
  }
  return vars.get(name)
}

/** 取 z-index 等纯数字字段，值非整数时立即报错（防止把 px/引用误当数字输出成非法 TS）。 */
function takeNumber(vars, name) {
  const value = take(vars, name)
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`[gen-tokens] ${name} 的值不是纯整数（${value}），无法映射为数字字段`)
  }
  return value
}

function asString(vars, name) {
  const value = take(vars, name)
  const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return `'${escaped}'`
}

/** 生成整个 tokens.ts 文本。 */
function build() {
  const vars = parseVars()

  const semanticBody = Object.entries(SEMANTIC_MAP)
    .map(([key, cssVar]) => `  ${key}: ${asString(vars, cssVar)},`)
    .join('\n')

  const bizBody = BIZ_KEYS.map((key) => {
    const color = asString(vars, `--color-biz-${key}`)
    const bg = asString(vars, `--color-biz-${key}-bg`)
    return `  ${key}: { color: ${color}, bg: ${bg} },`
  }).join('\n')

  const zBody = Object.entries(Z_MAP)
    .map(([key, cssVar]) => `  ${key}: ${takeNumber(vars, cssVar)},`)
    .join('\n')

  const vizPrimaryScale = DATA_VIZ_PRIMARY_SCALE.map((cssVar) => asString(vars, cssVar)).join(', ')
  const vizBody = `  primaryScale: [${vizPrimaryScale}],
  primary: ${asString(vars, '--color-primary')},
  axisLabel: ${asString(vars, '--color-text-body')},
  axisLine: ${asString(vars, '--color-border')},
  splitLine: ${asString(vars, '--color-border')},`

  return `/**
 * Design Token 的 TypeScript 常量映射 —— 由 scripts/gen-tokens.mjs 自动生成，禁止手改。
 *
 * 唯一值源：src/core/styles/tokens.css（CSS 自定义属性）。改任何数值请改 tokens.css，
 * 然后运行 \`npm run gen:tokens\` 重新生成；\`npm run check:tokens\`（已挂入 gate）检测漂移。
 */

/* ============================================================
 * 语义色（success / warning / error / info，各含主色与浅底 bg 等）
 * ============================================================ */
export const SEMANTIC_COLORS = {
${semanticBody}
} as const

/* ============================================================
 * 业务标识色（7 类，各含主色与浅底 bg）
 * ============================================================ */
export const BIZ_COLORS = {
${bizBody}
} as const

/* ============================================================
 * z-index 层级全套（禁止业务代码写裸数字，一律引用此处或 CSS 的 --z-*）
 * ============================================================ */
export const Z_INDEX = {
${zBody}
} as const

/* ============================================================
 * 通用数据可视化色板（值取自 tokens.css；字段语义挑选与数组顺序见 gen-tokens.mjs 映射）
 *   - 不绑定 ECharts，可给任意图表/数据可视化消费
 * ============================================================ */
export const DATA_VIZ_COLORS = {
${vizBody}
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
`
}

const CHECK = process.argv.includes('--check')

try {
  const next = build()
  const current = readFileSync(TS_FILE, 'utf8')
  if (next === current) {
    console.log(CHECK ? '[gen-tokens] --check 通过：tokens.ts 与 tokens.css 一致' : '[gen-tokens] tokens.ts 已是最新，无需覆写')
  } else {
    if (CHECK) {
      console.error('[gen-tokens] --check 失败：tokens.ts 与 tokens.css 不一致，请运行 npm run gen:tokens')
      process.exit(1)
    }
    writeFileSync(TS_FILE, next)
    console.log('[gen-tokens] 已重新生成 src/core/styles/tokens.ts')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
