import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = resolve(process.cwd(), 'src/core')

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (!['.ts', '.vue'].includes(extname(entry.name)) || entry.name.includes('.spec.')) return []
    return [path]
  })
}

function importedDomains(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const specifiers = [...source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].flatMap(
    (match) => (match[1] === undefined ? [] : [match[1]]),
  )
  return specifiers.flatMap((specifier) => {
    if (specifier.startsWith('@core/')) {
      const [domain] = specifier.slice(6).split('/')
      return domain === undefined ? [] : [domain]
    }
    if (!specifier.startsWith('.')) return []
    const target = relative(sourceRoot, resolve(dirname(file), specifier))
    const [targetDomain] = target.split(/[\\/]/)
    return targetDomain === undefined ? [] : [targetDomain]
  })
}

function findForbiddenImports(domain: string, forbidden: string[]): string[] {
  const violations: string[] = []
  for (const file of sourceFiles(resolve(sourceRoot, domain))) {
    for (const importedDomain of importedDomains(file)) {
      if (forbidden.includes(importedDomain)) {
        violations.push(`${relative(sourceRoot, file)} imports ${importedDomain}`)
      }
    }
  }
  return violations
}

describe('auth/stores/router static boundaries', () => {
  it('auth 领域不导入 stores 或 router', () => {
    expect(findForbiddenImports('auth', ['stores', 'router'])).toEqual([])
  })

  it('stores 领域不导入 auth 或 router', () => {
    expect(findForbiddenImports('stores', ['auth', 'router'])).toEqual([])
  })

  it('router 领域不导入 auth、stores 或 config 实现', () => {
    expect(findForbiddenImports('router', ['auth', 'stores', 'config'])).toEqual([])
  })
})
