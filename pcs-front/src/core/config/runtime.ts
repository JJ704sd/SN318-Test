/**
 * 运行时配置加载层（env.js 环境标识 + config.js 全环境配置）
 *
 * 架构：
 *   - public/env.js：环境标识，内容 { "env": "dev" | "test" | "prod" }，切换环境只改这个文件
 *   - public/config.js：全环境配置，含 dev/test/prod 三套配置，内容固定
 *   - runtime.ts：fetch env.js 拿环境标识，fetch config.js 拿全量配置，返回 config[env]
 *
 * 设计要点：
 *   - 不挂 window，避免 XSS 篡改风险
 *   - loadConfig() 在 main.ts 顶层 await，createApp 之前完成
 *   - getConfig() 同步返回 cache，供 env.ts 在运行时取值
 *   - 失败不抛错，cache 留 null，env.ts 走空对象（最终用各字段默认值）+ console.warn
 *   - 测试环境（vitest）不走 main.ts，env.ts 直接走空对象回落（或由 test-setup mock）
 *   - fetch URL 加时间戳查询参数，强制绕过浏览器/CDN/中间代理缓存
 */

/** 环境标识 */
export type EnvName = 'dev' | 'test' | 'prod'

/** 运行时配置结构（单环境） */
export interface RuntimeConfig {
  apiBaseUrl?: string
  /** 文件服务独立后端地址；未配置时回落 apiBaseUrl（见 env.apiFileUrl）。 */
  apiFileUrl?: string
  /** 网关独立后端地址；未配置时回落 apiBaseUrl（见 env.apiGatewayUrl）。 */
  apiGatewayUrl?: string
  apiTimeout?: number | string
  aiProvider?: 'mock' | 'llm'
  aiBaseUrl?: string
  aiStreamPath?: string
  aiFirstByteTimeout?: number | string
  aiIdleTimeout?: number | string
  /** AI 链路每个状态的最短展示时间（ms）；0 表示完全跟随接口实际节奏。 */
  aiStatusMinDuration?: number | string
  llmEndpoint?: string
  aiEnabled?: boolean | string
  aiAssistantEnabled?: boolean | string
  aiEmbeddedEnabled?: boolean | string
  permissionSystemCode?: string
  permissionVersion?: string
  useMockAuth?: boolean | string
  /** 仅开发态启用主数据 UI Mock；正式环境保持真实接口。 */
  useMockData?: boolean
  bffHost?: string
}

/** 全环境配置结构（config.js 内容） */
type AllConfigs = Record<EnvName, RuntimeConfig>

/** 模块作用域缓存，loadConfig 后填充；null 表示未加载或加载失败 */
let cache: RuntimeConfig | null = null

/** 进行中的 Promise，避免重复 fetch */
let inflight: Promise<void> | null = null

/**
 * 拉取 env.js + config.js，按 env.js 标识取对应环境配置。
 * - 成功：cache 填充对应环境配置
 * - 失败：cache 留 null，env.ts 走空对象回落 + console.warn
 * 重复调用只触发一次 fetch（inflight 去重）。
 */
export async function loadConfig(): Promise<void> {
  if (cache) return
  if (inflight) {
    await inflight
    return
  }
  inflight = (async () => {
    try {
      // 运行时配置位于部署根相对路径：拼接 Vite base 以支持子路径部署（如 /pcs/env.js）。
      const base = import.meta.env.BASE_URL.endsWith('/')
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`

      // 1) fetch env.js 拿环境标识
      const envRes = await fetch(`${base}env.js?t=${Date.now()}`, { cache: 'no-store' })
      if (!envRes.ok) {
        throw new Error(`/env.js HTTP ${envRes.status}`)
      }
      const { env } = (await envRes.json()) as { env: EnvName }

      // 2) fetch config.js 拿全量配置
      const configRes = await fetch(`${base}config.js?t=${Date.now()}`, { cache: 'no-store' })
      if (!configRes.ok) {
        throw new Error(`/config.js HTTP ${configRes.status}`)
      }
      const allConfigs = (await configRes.json()) as AllConfigs

      // 3) 取对应环境配置
      const envConfig = allConfigs[env]
      if (!envConfig) {
        console.warn(`[runtime] config.js 中无 ${env} 环境配置，使用空对象`)
        cache = {}
      } else {
        cache = envConfig
      }
    } catch (e) {
      console.warn('[runtime] 配置拉取失败，回落默认值', e)
      cache = null
    }
  })()
  await inflight
  inflight = null
}

/** 同步取运行时配置；未加载或加载失败返回 null，由调用方回落 */
export function getConfig(): RuntimeConfig | null {
  return cache
}

/** 是否已加载完成（仅供调试/断言用） */
export function isLoaded(): boolean {
  return cache !== null
}
