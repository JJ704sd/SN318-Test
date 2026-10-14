/**
 * 导入卫生回归检查（package.json: check:imports）：
 * 1. 禁止再引入 '@baiyun/template-core'（核心层已内联至 src/core，统一用 '@core/<领域子路径>'）；
 * 2. 禁止 @arco-design/web-vue 主包全量默认导入与全局注册（app.use(ArcoVue)）及全量 arco.css。
 *
 * 扫描 src 下 .ts/.vue/.js/.mjs 的 import 语句；注释行不计。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const srcDir = resolve(import.meta.dirname, '../src')
const FILE_EXT = ['.ts', '.vue', '.js', '.mjs']

const offenders = []
let fileCount = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full)
    } else if (FILE_EXT.some((ext) => entry.endsWith(ext))) {
      checkFile(full)
    }
  }
}

function checkFile(file) {
  fileCount += 1
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((raw, index) => {
    // 去除注释行与块注释片段（简单启发：整行以 // 或 <!-- 开头）
    const line = raw.trim()
    if (line.startsWith('//') || line.startsWith('<!--') || line.startsWith('*')) return
    const m = line.match(/from\s+['"]([^'"]+)['"]/)
    if (!m) return
    const spec = m[1]
    if (spec === '@baiyun/template-core' || spec.startsWith('@baiyun/template-core/')) {
      offenders.push(`${file}:${index + 1} 禁止 import '${spec}'（核心层已内联至 src/core，请用 @core/<领域子路径>）`)
    } else if (spec === '@arco-design/web-vue') {
      // 主包具名/类型导入（组件按需、类型）合法；仅全量默认导入即全局注册源，单独在下方捕获
    }
  })
  const source = readFileSync(file, 'utf8')
  const arcoDefault = source.match(/import\s+ArcoVue(Icon)?\s+from\s+['"]@arco-design\/web-vue/)
  if (arcoDefault) offenders.push(`${file} 出现 Arco 主包默认导入 ${arcoDefault[0]}（应使用按需引入）`)
  if (source.includes('app.use(ArcoVue')) offenders.push(`${file} 出现 ArcoVue 全局注册 app.use(ArcoVue...)`)
  if (source.includes('@arco-design/web-vue/dist/arco.css')) {
    offenders.push(`${file} 引入全量 arco.css（应使用按需组件样式）`)
  }
}

if (!existsSync(srcDir)) {
  console.warn('[check:imports] 未找到 src 目录')
  process.exit(0)
}
walk(srcDir)

if (offenders.length) {
  console.error('[check:imports] 导入卫生违规：')
  for (const o of offenders) console.error(`  - ${o}`)
  process.exit(1)
}
console.log(`[check:imports] OK：${fileCount} 个源码文件无 template-core 残留导入/Arco 全量导入`)
