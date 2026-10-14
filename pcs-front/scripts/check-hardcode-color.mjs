#!/usr/bin/env node
/**
 * 硬编码扫描闸门（实施方案任务 1.8 / 规范附录 B 禁止项）
 *
 * 扫描 src 下所有 .vue/.css/.less/.ts/.js 文件，报告：
 *   1) 十六进制颜色字面量（#RGB / #RRGGBB / #RRGGBBAA）
 *   2) z-index 裸数字（未走 var(--z-*)）
 * 打印「文件名:行号」，有命中则以非 0 退出码结束，供 CI / 预提交拦截。
 *
 * 排除 Token 定义文件（允许持有原始色值 / 层级数字）：
 *   - src/core/styles/tokens.css
 *   - src/core/styles/arco-theme.less
 *   - src/core/styles/tokens.ts
 *
 * 用法：node scripts/check-hardcode-color.mjs [--src <dir>] [--whitelist <paths>]
 *   --src        扫描目录，缺省 process.cwd()/src（业务项目运行时脚本在 node_modules 内，用 cwd 推目录）
 *   --whitelist  相对 src 的逗号分隔白名单路径，追加到内置白名单
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, sep, extname } from 'node:path'

/** 解析 --name value / --name=value 形式参数。 */
function parseArg(name) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.slice(`--${name}=`.length) : undefined
}

// 优先 --src 参数，缺省回落 process.cwd()/src（业务项目运行时脚本在 node_modules 内，须用 cwd 推扫描目录）
const SRC_DIR = resolve(process.cwd(), parseArg('src') || 'src')

const SCAN_EXTENSIONS = new Set(['.vue', '.css', '.less', '.ts', '.js'])

// 白名单：相对 src 的路径（Token 定义处，允许原始色值 / 层级数字）
const WHITELIST = new Set([
  join('core', 'styles', 'tokens.css'),
  join('core', 'styles', 'arco-theme.less'),
  join('core', 'styles', 'tokens.ts'),
])
// 白名单目录前缀：整个目录允许持有原始色值/层级数字（如主题分片 arco-theme/）
const WHITELIST_DIRS = [join('core', 'styles', 'arco-theme')]

// --whitelist 参数：按逗号分隔的相对 src 路径追加到白名单
const extraWhitelist = parseArg('whitelist')
if (extraWhitelist) {
  for (const p of extraWhitelist.split(',')) {
    const trimmed = p.trim()
    if (trimmed) WHITELIST.add(join(...trimmed.split(/[/\\]/)))
  }
}

// 十六进制颜色：# 后接 3 / 4 / 6 / 8 位十六进制，且其后不再是十六进制字符（避免匹配更长 token）
const HEX_COLOR_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/
// z-index 裸数字：z-index: 123（放行 var(--z-*) 与关键字 auto/inherit/initial/unset）
const BARE_ZINDEX_RE = /z-index\s*:\s*-?\d+/i

/**
 * 逐行剥离注释内容，只保留会真正生效的代码，避免注释里说明性的 hex / 数字被误报。
 * 用状态机跨行处理 CSS/LESS/JS 的块注释 /* *\/，并去除行注释 //、Vue 模板注释 <!-- -->。
 * 返回与原文件等长的字符串数组（保留行号），注释部分以空格占位。
 */
function stripComments(source) {
  const lines = source.split(/\r?\n/)
  let inBlock = false
  return lines.map((line) => {
    let out = ''
    let i = 0
    while (i < line.length) {
      if (inBlock) {
        if (line[i] === '*' && line[i + 1] === '/') {
          inBlock = false
          i += 2
        } else {
          i += 1
        }
        continue
      }
      // 进入块注释
      if (line[i] === '/' && line[i + 1] === '*') {
        inBlock = true
        i += 2
        continue
      }
      // 行注释 // ——剩余整行丢弃
      if (line[i] === '/' && line[i + 1] === '/') break
      // Vue/HTML 注释 <!-- ...：本行剩余丢弃（跨行少见，按行处理已覆盖模板注释常见写法）
      if (line[i] === '<' && line.slice(i, i + 4) === '<!--') break
      out += line[i]
      i += 1
    }
    return out
  })
}

/** 递归收集待扫描文件 */
function collectFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...collectFiles(full))
    } else if (SCAN_EXTENSIONS.has(extname(name))) {
      out.push(full)
    }
  }
  return out
}

/** 判断文件是否在白名单 */
function isWhitelisted(absPath) {
  const rel = relative(SRC_DIR, absPath)
  if (WHITELIST.has(rel)) return true
  return WHITELIST_DIRS.some((dir) => rel === dir || rel.startsWith(`${dir}${sep}`))
}

const hits = []

for (const file of collectFiles(SRC_DIR)) {
  if (isWhitelisted(file)) continue
  const relPath = `src${sep}${relative(SRC_DIR, file)}`
  const lines = stripComments(readFileSync(file, 'utf8'))

  lines.forEach((line, i) => {
    const lineNo = i + 1
    const hex = line.match(HEX_COLOR_RE)
    if (hex) {
      hits.push(`${relPath}:${lineNo}  十六进制颜色 "${hex[0]}"  → 请改用 var(--color-*)`)
    }
    const zi = line.match(BARE_ZINDEX_RE)
    if (zi) {
      hits.push(`${relPath}:${lineNo}  z-index 裸数字 "${zi[0]}"  → 请改用 var(--z-*)`)
    }
  })
}

if (hits.length > 0) {
  console.error(`\n✗ 硬编码扫描命中 ${hits.length} 处：\n`)
  for (const h of hits) console.error(`  ${h}`)
  console.error('\n请改用 tokens.css 中的 CSS 变量后重试。\n')
  process.exit(1)
}

console.log('✓ 硬编码扫描通过：src 下无十六进制颜色字面量 / z-index 裸数字。')
