/**
 * 回归：运行时配置晚于模块求值时，baseURL 必须仍然正确。
 *
 * 背景（曾经的生产阻断缺陷）：API_HOSTS 曾写成 `main: env.apiBaseUrl` 字面量、
 * http 单例在模块加载时即 createHttp(API_HOSTS.main)。本模块被包入口静态导入，
 * 求值时机早于业务 main.ts 的 `await loadConfig()`，导致地址被固化成空串，
 * 分离部署下所有请求打到前端源而非后端域名。
 *
 * 本 spec 模拟真实时序：先加载 http 模块（配置尚未就绪），再让配置就绪，
 * 断言 API_HOSTS 与实际发出的请求 URL 都取到最新地址。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

/** 受测模块读取的运行时地址，测试中可变以模拟 loadConfig 前后。 */
let currentBaseUrl = ''

vi.mock('@core/config/env', () => ({
  env: {
    get apiBaseUrl() {
      return currentBaseUrl
    },
    // 文件/网关未独立配置时回落主地址（与新建且未填 apiFileUrl/apiGatewayUrl 的旧后端一致）
    get apiFileUrl() {
      return currentBaseUrl
    },
    get apiGatewayUrl() {
      return currentBaseUrl
    },
    get apiTimeout() {
      return 15000
    },
    get useMockAuth() {
      return false
    },
  },
}))

/**
 * 取请求最终 URL，不真实发网络请求。
 * 用自定义 adapter 而非再注册一个 request 拦截器：axios 的 request 拦截器按注册顺序倒序执行，
 * 测试里后注册的会跑在包内 onRequest 之前，观测不到回填结果。adapter 在全部拦截器之后运行。
 */
async function captureRequestUrl(
  instance: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig,
): Promise<string> {
  let seen = ''
  instance.defaults.adapter = async (requestConfig) => {
    seen = `${requestConfig.baseURL ?? ''}${requestConfig.url ?? ''}`
    throw new Error('__STOP__')
  }
  await instance.get(url, config).catch(() => {})
  return seen
}

describe('baseURL 运行时时序', () => {
  beforeEach(() => {
    vi.resetModules()
    currentBaseUrl = '' // loadConfig 之前：配置未就绪
  })

  afterEach(() => {
    currentBaseUrl = ''
  })

  // 首个用例含冷启动的动态 import（http 模块及其 axios/arco 依赖链），全量跑时超出默认 5s
  it(
    '模块加载早于配置就绪时，API_HOSTS 仍取到最新地址',
    async () => {
      const { API_HOSTS } = await import('../http')
      expect(API_HOSTS.main).toBe('')

      currentBaseUrl = 'http://dev-api.example.com' // loadConfig 完成

      expect(API_HOSTS.main).toBe('http://dev-api.example.com')
      expect(API_HOSTS.file).toBe('http://dev-api.example.com')
      expect(API_HOSTS.gateway).toBe('http://dev-api.example.com')
    },
    30_000,
  )

  it('配置就绪后，http 单例发出的请求带上真实后端地址', async () => {
    const { http } = await import('../http') // 此刻配置仍为空，实例已创建

    currentBaseUrl = 'http://dev-api.example.com'

    const actual = await captureRequestUrl(http, '/api/waybills')
    expect(actual).toBe('http://dev-api.example.com/api/waybills')
  })

  it('getHttp 取得的非 main 模块实例同样带上真实地址', async () => {
    const { getHttp } = await import('../http')
    const fileHttp = getHttp('file')

    currentBaseUrl = 'http://dev-api.example.com'

    const actual = await captureRequestUrl(fileHttp, '/api/files/1')
    expect(actual).toBe('http://dev-api.example.com/api/files/1')
  })

  it('业务项目覆盖 API_HOSTS 内置键时，覆盖值优先于 env', async () => {
    const { API_HOSTS, getHttp } = await import('../http')
    currentBaseUrl = 'http://dev-api.example.com'

    API_HOSTS.file = 'https://files.example.com'
    expect(API_HOSTS.file).toBe('https://files.example.com')
    expect(API_HOSTS.main).toBe('http://dev-api.example.com') // 未被波及

    const actual = await captureRequestUrl(getHttp('file'), '/api/files/1')
    expect(actual).toBe('https://files.example.com/api/files/1')
  })

  it('meta.baseURL 单请求级覆盖优先于模块地址', async () => {
    const { http } = await import('../http')
    currentBaseUrl = 'http://dev-api.example.com'

    const actual = await captureRequestUrl(http, '/api/x', {
      meta: { baseURL: 'https://override.example.com' },
    })
    expect(actual).toBe('https://override.example.com/api/x')
  })
})
