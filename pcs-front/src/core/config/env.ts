// 环境配置集中出口：运行时配置（getConfig）+ 默认值。
// 读取优先级：getConfig()（运行时 /env.js + /config.js）> 默认值。
// 业务侧一律从这里取值（如 env.apiBaseUrl），禁止散读 import.meta.env。
//
// 改造说明：原架构在 window 上挂 window.__APP_CONFIG__，有 XSS 篡改风险；
// 现改为 main.ts 主动 fetch /env.js + /config.js 存内存模块作用域变量（src/config/runtime.ts），
// env.ts 通过 getConfig() 取值，不挂 window。
// 不再有 .env 构建期配置（单一运行时配置源）。
// 测试环境（MODE==='test'）不走 loadConfig，getRuntime() 直接返回 {} 走默认值。
//
// 关键设计：env 对象用 getter 形式，每次访问 env.xxx 时从 getConfig() 实时取值。
// 不能用顶层 const 求值，因为 env.ts 被 router 等模块静态导入，加载时机早于 main.ts 的 await loadConfig()，
// 顶层 const 会在 loadConfig 之前求值，导致 runtime 永远为 {}，运行时配置失效。

import { getConfig, type RuntimeConfig } from '@core/config/runtime'

/** @deprecated 2.0 移除：AI 服务改用 registerAiService()/getAiService() 显式注册，不再用 provider 字符串切换。 */
export type AiProvider = 'mock' | 'llm'

/** 向后兼容别名：原 AppRuntimeConfig 现统一为 RuntimeConfig */
export type AppRuntimeConfig = RuntimeConfig

/**
 * 运行时配置实时取值：测试模式返回空对象回落到默认值；
 * 其他模式从 getConfig() 实时取（loadConfig 完成后非空，失败时 null 走默认值）。
 * 每次调用都重新读取，保证 loadConfig 后 env 能拿到最新 cache。
 */
function getRuntime(): RuntimeConfig {
  if (import.meta.env.MODE === 'test') return {}
  return getConfig() ?? {}
}

/** 运行时优先取字符串：config.js > 默认 */
function readString(
  runtimeValue: string | number | undefined,
  fallback = '',
): string {
  const value = runtimeValue
  if (value === undefined || value === null || value === '') return fallback
  return String(value)
}

/** env 值均为 string，数字需显式转换，非法值回落默认 */
function readNumber(
  runtimeValue: number | string | undefined,
  fallback: number,
): number {
  const raw = runtimeValue
  if (raw === undefined || raw === null || raw === '') return fallback
  const num = Number(raw)
  return Number.isFinite(num) ? num : fallback
}

/** 开关类：'true' -> true */
export function readBoolean(
  runtimeValue: boolean | string | undefined,
  fallback = false,
): boolean {
  const raw = runtimeValue
  if (raw === undefined || raw === null || raw === '') return fallback
  return raw === true || raw === 'true'
}

/**
 * env 配置对象：用 getter 形式，每次访问实时从 getConfig() 取值。
 * 访问方式不变（env.apiBaseUrl），但求值时机推迟到访问时，确保 loadConfig 后能拿到最新 cache。
 */
export const env = {
  get apiBaseUrl(): string {
    return readString(getRuntime().apiBaseUrl)
  },
  // 文件服务 / 网关独立后端地址：未配置时回落到主业务地址（避免静默连空地址）
  get apiFileUrl(): string {
    const runtime = getRuntime()
    return readString(runtime.apiFileUrl || runtime.apiBaseUrl)
  },
  get apiGatewayUrl(): string {
    const runtime = getRuntime()
    return readString(runtime.apiGatewayUrl || runtime.apiBaseUrl)
  },
  get apiTimeout(): number {
    return readNumber(getRuntime().apiTimeout, 15000)
  },

  /** @deprecated 2.0 移除：适配器一律 registerAiService() 显式注册；本字段不再驱动 Mock 回落（S4-C），仅用于 assertEnv 的 'llm' 端点缺失告警。 */
  get aiProvider(): AiProvider {
    return readString(getRuntime().aiProvider, 'mock') as AiProvider
  },
  // AI baseURL 未配置时回落到后端 API baseURL
  get aiBaseUrl(): string {
    const runtime = getRuntime()
    return readString(runtime.aiBaseUrl || runtime.apiBaseUrl)
  },
  get aiStreamPath(): string {
    return readString(getRuntime().aiStreamPath, '/ai/stream')
  },
  // 首包超时：开流到第一个 chunk 的等待上限（ms），超时归 timeoutModel（模型未响应）
  get aiFirstByteTimeout(): number {
    return readNumber(getRuntime().aiFirstByteTimeout, 20000)
  },
  // 空闲超时：流中途两个 chunk 之间的停顿上限（ms），超时归 timeoutServer（服务端仍在处理）
  get aiIdleTimeout(): number {
    return readNumber(getRuntime().aiIdleTimeout, 30000)
  },
  // AI 每个状态的最短展示时间：0 不补时，完全按接口真实节奏切换。
  get aiStatusMinDuration(): number {
    return Math.max(0, readNumber(getRuntime().aiStatusMinDuration, 0))
  },
  /** @deprecated 2.0 移除：后端端点由业务自定义 adapter 内部处理，不再由模板统一配置。 */
  get llmEndpoint(): string {
    return readString(getRuntime().llmEndpoint)
  },

  // AI 能力开关矩阵（S4-F）：总开关关闭时业务不加载任何 AI（代码/样式/图片/Mock）；
  // 助手/内嵌子开关对应 AI UI 域（@core/ai/assistant|embedded）按需加载。
  // 默认全关（保守）：未在 config.js 显式开启的业务默认无 AI。子开关语义由业务组合总开关使用。
  get aiEnabled(): boolean {
    return readBoolean(getRuntime().aiEnabled, false)
  },
  get aiAssistantEnabled(): boolean {
    return readBoolean(getRuntime().aiAssistantEnabled, false)
  },
  get aiEmbeddedEnabled(): boolean {
    return readBoolean(getRuntime().aiEmbeddedEnabled, false)
  },

  // 权限中心：业务系统编码 + 资源版本（mock 阶段用于构造 profile；BFF 就绪后由 BFF 校验）
  get permissionSystemCode(): string {
    return readString(getRuntime().permissionSystemCode, 'frontend_demo')
  },
  get permissionVersion(): string {
    return readString(getRuntime().permissionVersion, 'test')
  },
  // 认证模式开关：true 时业务前端走 src/mock/auth.ts 不发 fetch（BFF 未就绪）
  // BFF 就绪后置 false，前端走同源 /auth/* 真实请求。
  // 默认 false（fail-closed，B-03）：未加载到显式配置时绝不回落 Mock，避免配置失败把真实 BFF 静默切到模拟登录。
  get useMockAuth(): boolean {
    return readBoolean(getRuntime().useMockAuth, false)
  },
  // 业务 BFF host：生产环境注入；dev/test 留空走 vite proxy /auth -> BFF
  get bffHost(): string {
    return readString(getRuntime().bffHost, '')
  },
}

/** 关键变量缺失时给出可感知的报错，避免静默连到空地址 */
export function assertEnv(): void {
  const missing: string[] = []
  if (!env.apiBaseUrl) missing.push('apiBaseUrl (/config.js)')
  if (env.aiProvider === 'llm' && !env.llmEndpoint) {
    missing.push('llmEndpoint (/config.js)')
  }
  if (missing.length > 0) {
    console.warn(
      `[env] 缺少关键环境变量：${missing.join(', ')}。` +
        `请检查 /env.js 环境标识与 /config.js 对应环境配置。`,
    )
  }
}
