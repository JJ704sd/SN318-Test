/**
 * 构建清单回归检查：首页/登录初始请求不得包含懒加载与保留资源。
 *
 * 判定依据 dist/index.html 的初始 <script>/<link> 引用（含静态 modulepreload），
 * 若出现 ECharts、AI（/ai、assistant、embedded、mock 数据）、组件展示页或工具样式
 * 即视为违规——它们应只随对应功能懒加载。
 *
 * 用法：先 npm run build，再 node scripts/check-entrypoints.mjs（package.json: check:entry）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const htmlPath = resolve(import.meta.dirname, '../dist/index.html')
if (!existsSync(htmlPath)) {
  console.error('[check:entry] 未找到 dist/index.html，请先执行 npm run build')
  process.exit(1)
}

const html = readFileSync(htmlPath, 'utf8')
const refs = [...html.matchAll(/"\/assets\/([^"]+)"/g)].map((m) => m[1])

/** 允许出现在首页初始请求之外的前缀/文件名模式（应被拆分到懒 chunk） */
const FORBIDDEN_PATTERNS = [
  /echarts/,
  /zrender/,
  /^assistant-/,
  /^ai-/,
  /AiAbort/,
  /^embedded-/,
  /^nl-filter-/,
  /^replies-/,
  /^suggestions-/,
  /ListAiSuggestions/,
  /ListEmptyAi/,
  /ComponentsShowcase/,
  /^utilities/,
]

const hits = refs.filter((file) => FORBIDDEN_PATTERNS.some((pattern) => pattern.test(file)))
if (hits.length) {
  console.error('[check:entry] 首页初始请求包含应懒加载的资源：')
  for (const hit of hits) console.error(`  - ${hit}`)
  console.error('请检查 dynamic import / 分块配置，确保上述资源不进入首屏。')
  process.exit(1)
}

console.log(`[check:entry] OK：首页初始 ${refs.length} 项资源不含 ECharts/AI/展示页/工具样式`)
