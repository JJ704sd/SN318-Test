/**
 * 敏感信息/密钥扫描（package.json: check:secrets）：识别仓库源码中硬编码的高置信密钥。
 *
 * 检出的高置信密钥（必然致命）使 gate 失败：
 *   - 形如 `apiKey = "..."` / `secret:` / `token =` / `password=` 且赋值为 16+ 位疑似密钥；
 *   - PEM 私钥块 `-----BEGIN <算法> PRIVATE KEY-----`；
 *   - 疑似 AWS / GitHub 等平台访问令牌。
 *
 * 明确的例外（不入违规）：
 *   - 构建产物（node_modules / dist / dist-*）与 .git 目录：非源码，不纳入扫描面。
 *
 * 说明：刻意未复用 @baiyun/template-core 的 dist/scripts 脚本（区别于 check:color）——核心层当前
 * 未发布稳定版本，跨仓复用会被发行链卡住；安全门禁需尽快独立落地，故两仓各自维护一份。
 *
 * 用法：node scripts/check-secrets.mjs（package.json: check:secrets）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, isAbsolute, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')

// 排除的目录/文件片段（命中即整条路径跳过）
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-es', 'coverage'])
// .npmrc 中的凭据必须阻断发布。
const EXCLUDED_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'])

// 高置信密钥模式
const SECRET_PATTERNS = [
  // 形如 key/secret/token/password 赋值，值为 16+ 位疑似密钥（不含纯占位符）
  {
    re: /(api[_-]?key|app[_-]?secret|secret[_-]?key|password|passwd|access[_-]?token|auth[_-]?token|private[_-]?key)\b['"]?\s*[:=]\s*['"]([^'"\s]{16,})['"]/i,
    label: '疑似硬编码密钥',
  },
  // PEM 私钥块
  {
    re: /-----BEGIN (?:RSA |OPENSSH |EC |DSA |ED25519 )?PRIVATE KEY-----/,
    label: 'PEM 私钥块',
  },
  // 疑似 AWS 访问令牌（AKIA + 16 位）
  { re: /\bAKIA[0-9A-Z]{16}\b/, label: '疑似 AWS Access Key' },
  // 疑似 GitHub PAT（ghp_ + 36 位）；GIthub fine-grained 前缀 gho_/github_pat_
  { re: /\bgh[pousr]_[A-Za-z0-9_]{15,}\b/, label: '疑似 GitHub Token' },
]

const MISSING_PLACEHOLDERS = /^(?:[x*]{6,}|<.*>|your_.+|example_.+|dummy.*|TODO.*)$/i

const violations = []
let scannedFiles = 0

function relativePath(file) {
  return file.replace(/\\/g, '/').replace(repoRoot.replace(/\\/g, '/'), '.').replace(/^\.\/?/, '')
}

function shouldSkip(file, isDir) {
  const base = file.split(/[/\\]/).pop()
  if (isDir) return EXCLUDED_DIRS.has(base)
  if (EXCLUDED_FILES.has(base)) return true
  // 仅跳过二进制与体积过大文件，避免误扫图片/锁文件
  const lower = base.toLowerCase()
  return /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|eot|ttf|map|lock|node)$/.test(lower)
}

function walk(dir) {
  let entries = []
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (!shouldSkip(full, true)) walk(full)
    } else if (stat.isFile() && !shouldSkip(full, false)) {
      if (stat.size > 2 * 1024 * 1024) continue // 跳过 >2MB 大文件
      if (entry === '.npmrc') {
        const content = readFileSync(full, 'utf8')
        if (/_authToken\s*=\s*\S+/.test(content)) {
          violations.push(`${relativePath(full)}：禁止提交 registry 凭据`)
        }
        continue
      }
      scannedFiles += 1
      const lines = readFileSync(full, 'utf8').split('\n')
      lines.forEach((line, idx) => {
        for (const { re, label } of SECRET_PATTERNS) {
          if (re.test(line)) {
            const m = line.match(re)
            const value = (m && m[2]) || (m && m[0]) || ''
            if (value && MISSING_PLACEHOLDERS.test(value)) break
            violations.push(`${relativePath(full)}:${idx + 1}：${label}`)
            break
          }
        }
      })
    }
  }
}

if (isAbsolute(repoRoot) && existsSync(repoRoot)) {
  walk(repoRoot)
} else {
  console.error('[check:secrets] 未找到仓库根目录')
  process.exit(1)
}



if (violations.length) {
  console.error('[check:secrets] 检出疑似硬编码密钥：')
  for (const v of violations) console.error(`  - ${v}`)
  console.error('请将密钥移入环境变量 / 安全凭据库，不要把真实凭据写入源码。')
  process.exit(2)
}

console.log(`[check:secrets] OK：扫描 ${scannedFiles} 个源码文件，未检出高置信密钥`)