import { createRequire } from 'node:module'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

const root = './pcs-front'
const evidenceDir = './recipes/pcs-front-local/stylelint-fix-20261014'
const require = createRequire(path.join(root, 'package.json'))
const { parse } = require('@vue/compiler-sfc')
const postcss = require('postcss')
const targets = [
  'src/layout/components/PageHeader.vue',
  'src/views/master-data/views/MasterDataWorkspace.view.vue',
]
const protectedFiles = [
  'public/config.js', 'public/env.js', 'src/main.ts',
  'src/mock/auth.ts', 'src/mock/lmd.ts', 'src/mock/lmd-store.ts', 'src/mock/lmd-data.ts',
  'src/mock/service-unit/service-unit.ts', 'src/mock/service-unit/ordering-rule.ts',
  'src/mock/supplier/supplier.ts',
]
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex')
const canonicalCss = node => {
  if (node.type === 'comment') return undefined
  return {
    type: node.type, selector: node.selector, name: node.name, params: node.params,
    prop: node.prop, value: node.value, important: node.important,
    nodes: node.nodes?.map(canonicalCss).filter(Boolean),
  }
}

if (process.argv[2] === 'before') {
  await mkdir(evidenceDir, { recursive: true })
  const hashes = {}
  for (const relative of targets) {
    await writeFile(path.join(evidenceDir, path.basename(relative) + '.before'), await readFile(path.join(root, relative)))
  }
  for (const relative of protectedFiles) hashes[relative] = sha256(await readFile(path.join(root, relative)))
  await writeFile(path.join(evidenceDir, 'protected-hashes.json'), JSON.stringify(hashes, null, 2))
  console.log(JSON.stringify({ savedTargets: targets.length, protectedFiles: protectedFiles.length }))
} else {
  const targetsResult = []
  for (const relative of targets) {
    const before = parse(await readFile(path.join(evidenceDir, path.basename(relative) + '.before'), 'utf8')).descriptor
    const after = parse(await readFile(path.join(root, relative), 'utf8')).descriptor
    const activeCssEqual = before.styles.length === after.styles.length && before.styles.every((style, i) =>
      JSON.stringify(canonicalCss(postcss.parse(style.content))) === JSON.stringify(canonicalCss(postcss.parse(after.styles[i].content))))
    const logicEqual = before.template?.content === after.template?.content && before.script?.content === after.script?.content && before.scriptSetup?.content === after.scriptSetup?.content
    targetsResult.push({ file: relative, activeCssEqual, logicEqual })
  }
  const hashes = JSON.parse(await readFile(path.join(evidenceDir, 'protected-hashes.json'), 'utf8'))
  const changedProtectedFiles = []
  for (const [relative, hash] of Object.entries(hashes)) {
    if (sha256(await readFile(path.join(root, relative))) !== hash) changedProtectedFiles.push(relative)
  }
  const passed = targetsResult.every(result => result.activeCssEqual && result.logicEqual) && changedProtectedFiles.length === 0
  const report = { checkedAt: new Date().toISOString(), passed, targets: targetsResult, protectedFiles: protectedFiles.length, changedProtectedFiles }
  await writeFile(path.join(evidenceDir, 'unchanged-behavior.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = passed ? 0 : 1
}
