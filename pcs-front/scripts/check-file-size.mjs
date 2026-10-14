/**
 * 文件规模回归检查（package.json: check:size）：Vue SFC 单文件逻辑行数 ≤ 300。
 *
 * 口径与核心层一致：逻辑行 = 排除 <style>...</style> 块后的行数（样式行不代表逻辑复杂度，
 * 拆样式反而割裂组件内聚）。纯数据文件（常量表 / mock 数据）本就豁免。
 *
 * 超出 300 行即报错并进入 deliver gate（M-04），避免两种偏差：
 * - 规则只靠人工判断、无法自动执行；
 * - 为纯凑行数而无意义拆分（产生无职责的单行包装组件）。
 *
 * 用法：node scripts/check-file-size.mjs（package.json: check:size）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const srcDir = resolve(import.meta.dirname, '../src')
const MAX = 300

const violations = []
let fileCount = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full)
    } else if (entry.endsWith('.vue')) {
      checkFile(full)
    }
  }
}

function checkFile(file) {
  fileCount += 1
  const source = readFileSync(file, 'utf8')
  // 摘除 <style ...>...</style> 块后统计逻辑行数
  const logicLines = source.replace(/<style[\s\S]*?<\/style>/g, '').split('\n').length
  if (logicLines > MAX) {
    violations.push(
      `${file}：逻辑行 ${logicLines} 行（已排除 <style>）超过 ${MAX} 行上限`,
    )
  }
}

if (!existsSync(srcDir)) {
  console.error('[check:size] 未找到 src 目录')
  process.exit(1)
}

walk(srcDir)

if (violations.length) {
  console.error('[check:size] 存在超限 SFC：')
  for (const v of violations) console.error(`  - ${v}`)
  console.error('请按职责拆分（不改变 DOM/视觉），或将受控例外记录进规则文件。')
  process.exit(1)
}
console.log(`[check:size] OK：${fileCount} 个 SFC 逻辑行数均 ≤ ${MAX} 行`)
