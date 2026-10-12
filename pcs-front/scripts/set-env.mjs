#!/usr/bin/env node
/**
 * set-env.mjs -- 生成 public/env.js（环境标识文件）
 *
 * 用法：node scripts/set-env.mjs <env>
 *   env: dev | test | prod
 *
 * 生成内容：{ "env": "<env>" }
 *
 * 切换环境：
 *   npm run dev          -> set-env dev  -> public/env.js = { "env": "dev" }
 *   npm run dev:test     -> set-env test -> public/env.js = { "env": "test" }
 *   npm run dev:prod     -> set-env prod -> public/env.js = { "env": "prod" }
 *
 * 运行时 main.ts fetch /env.js 拿环境标识，再从 /config.js 取对应环境配置。
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const env = process.argv[2]
const VALID_ENVS = ['dev', 'test', 'prod']

if (!VALID_ENVS.includes(env)) {
  console.error(`[set-env] 无效环境：${env ?? '(未指定)'}，可选：${VALID_ENVS.join(', ')}`)
  console.error('  用法：node scripts/set-env.mjs <dev|test|prod>')
  process.exit(1)
}

const targetPath = resolve(process.cwd(), 'public/env.js')
const content = JSON.stringify({ env }, null, 2) + '\n'
writeFileSync(targetPath, content)
console.log(`[set-env] public/env.js 已生成：env = ${env}`)
