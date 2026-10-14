/**
 * env AI 能力开关读取契约（S4-F）：
 * 默认全关（保守）；config.js 经运行时配置覆盖（boolean 或 'true' 字符串）；三开关独立。
 * getRuntime 在 MODE==='test' 恒走默认值，故用 vi.stubEnv 切到 dev 以走被 mock 的 getConfig。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuntimeConfig } from '@core/config/runtime'

vi.mock('@core/config/runtime', () => ({
  getConfig: vi.fn<() => RuntimeConfig | null>(() => ({})),
}))

import { getConfig } from '@core/config/runtime'
import { env, assertEnv } from './env'

const mockedGetConfig = vi.mocked(getConfig)

describe('env AI 能力开关（S4-F）', () => {
  beforeEach(() => {
    vi.stubEnv('MODE', 'dev')
    mockedGetConfig.mockReturnValue({})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('默认全关（config 无 AI 开关）', () => {
    expect(env.aiEnabled).toBe(false)
    expect(env.aiAssistantEnabled).toBe(false)
    expect(env.aiEmbeddedEnabled).toBe(false)
  })

  it('config.js 布尔值开启', () => {
    mockedGetConfig.mockReturnValue({
      aiEnabled: true,
      aiAssistantEnabled: true,
      aiEmbeddedEnabled: true,
    })
    expect(env.aiEnabled).toBe(true)
    expect(env.aiAssistantEnabled).toBe(true)
    expect(env.aiEmbeddedEnabled).toBe(true)
  })

  it("config.js 'true' 字符串开启", () => {
    mockedGetConfig.mockReturnValue({ aiEnabled: 'true' })
    expect(env.aiEnabled).toBe(true)
  })

  it('子开关独立于总开关', () => {
    mockedGetConfig.mockReturnValue({ aiEmbeddedEnabled: true })
    expect(env.aiEnabled).toBe(false)
    expect(env.aiAssistantEnabled).toBe(false)
    expect(env.aiEmbeddedEnabled).toBe(true)
  })

  it('AI 状态默认按接口节奏，自定义最短时间按毫秒读取且不允许负数', () => {
    expect(env.aiStatusMinDuration).toBe(0)
    mockedGetConfig.mockReturnValue({ aiStatusMinDuration: 3000 })
    expect(env.aiStatusMinDuration).toBe(3000)
    mockedGetConfig.mockReturnValue({ aiStatusMinDuration: -1 })
    expect(env.aiStatusMinDuration).toBe(0)
  })

  // ---- 分支补全（getRuntime test 分支、各 getter 默认/覆盖、readString/readNumber/readBoolean 边界、assertEnv）----

  it('MODE=test 时 getRuntime 返回空对象、不读 getConfig、走默认值', () => {
    vi.stubEnv('MODE', 'test')
    mockedGetConfig.mockClear()
    expect(env.aiEnabled).toBe(false)
    expect(env.apiBaseUrl).toBe('')
    expect(mockedGetConfig).not.toHaveBeenCalled()
  })

  it('getConfig 返回 null（加载失败）时回落空对象走默认值', () => {
    mockedGetConfig.mockReturnValue(null)
    expect(env.apiBaseUrl).toBe('')
    expect(env.useMockAuth).toBe(false)
  })

  it('未配置的字段走默认值，file/gateway/AI base 落空串', () => {
    expect(env.apiBaseUrl).toBe('')
    expect(env.apiFileUrl).toBe('')
    expect(env.apiGatewayUrl).toBe('')
    expect(env.apiTimeout).toBe(15000)
    expect(env.aiProvider).toBe('mock')
    expect(env.aiBaseUrl).toBe('')
    expect(env.aiStreamPath).toBe('/ai/stream')
    expect(env.aiFirstByteTimeout).toBe(20000)
    expect(env.aiIdleTimeout).toBe(30000)
    expect(env.llmEndpoint).toBe('')
    expect(env.permissionSystemCode).toBe('frontend_demo')
    expect(env.permissionVersion).toBe('test')
    expect(env.useMockAuth).toBe(false)
    expect(env.bffHost).toBe('')
  })

  it('file/gateway/AI base 未配置时回落到 apiBaseUrl', () => {
    mockedGetConfig.mockReturnValue({ apiBaseUrl: '/api' })
    expect(env.apiFileUrl).toBe('/api')
    expect(env.apiGatewayUrl).toBe('/api')
    expect(env.aiBaseUrl).toBe('/api')
  })

  it('配置提供字段：字符串按需解析', () => {
    mockedGetConfig.mockReturnValue({
      apiBaseUrl: '/api',
      apiFileUrl: '/file',
      apiGatewayUrl: '/gateway',
      apiTimeout: '8000',
      aiProvider: 'llm',
      aiBaseUrl: '/llm',
      aiStreamPath: '/s',
      aiFirstByteTimeout: '15000',
      aiIdleTimeout: '25000',
      aiStatusMinDuration: '1200',
      llmEndpoint: '/ep',
      permissionSystemCode: 'sys',
      permissionVersion: 'v2',
      useMockAuth: true,
      bffHost: '/bff',
    })
    expect(env.apiBaseUrl).toBe('/api')
    expect(env.apiFileUrl).toBe('/file')
    expect(env.apiGatewayUrl).toBe('/gateway')
    expect(env.apiTimeout).toBe(8000)
    expect(env.aiProvider).toBe('llm')
    expect(env.aiBaseUrl).toBe('/llm')
    expect(env.aiStreamPath).toBe('/s')
    expect(env.aiFirstByteTimeout).toBe(15000)
    expect(env.aiIdleTimeout).toBe(25000)
    expect(env.aiStatusMinDuration).toBe(1200)
    expect(env.llmEndpoint).toBe('/ep')
    expect(env.permissionSystemCode).toBe('sys')
    expect(env.permissionVersion).toBe('v2')
    expect(env.useMockAuth).toBe(true)
    expect(env.bffHost).toBe('/bff')
  })

  it('数字字段为数值字符串/空串/null/非法值时回落默认', () => {
    mockedGetConfig.mockReturnValue({ apiTimeout: '8000', aiFirstByteTimeout: 'abc', aiIdleTimeout: '' })
    expect(env.apiTimeout).toBe(8000)
    expect(env.aiFirstByteTimeout).toBe(20000)
    expect(env.aiIdleTimeout).toBe(30000)
    mockedGetConfig.mockReturnValue({ aiTimeout: null as unknown as string, aiFirstByteTimeout: null as unknown as string })
    expect(env.aiFirstByteTimeout).toBe(20000)
  })

  it('字符串字段为 null/空串时回落默认', () => {
    mockedGetConfig.mockReturnValue({
      apiBaseUrl: null as unknown as string,
      aiStreamPath: '',
      llmEndpoint: null as unknown as string,
    })
    expect(env.apiBaseUrl).toBe('')
    expect(env.aiStreamPath).toBe('/ai/stream')
    expect(env.llmEndpoint).toBe('')
  })

  it("useMockAuth 显式 false / 'false' / null / 空串 均为关闭", () => {
    mockedGetConfig.mockReturnValue({ useMockAuth: false })
    expect(env.useMockAuth).toBe(false)
    mockedGetConfig.mockReturnValue({ useMockAuth: 'false' })
    expect(env.useMockAuth).toBe(false)
    mockedGetConfig.mockReturnValue({ useMockAuth: null as unknown as boolean })
    expect(env.useMockAuth).toBe(false)
    mockedGetConfig.mockReturnValue({ useMockAuth: '' as unknown as boolean })
    expect(env.useMockAuth).toBe(false)
  })

  it('assertEnv：关键变量齐全不告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetConfig.mockReturnValue({ apiBaseUrl: '/api', llmEndpoint: '/ep' })
    assertEnv()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('assertEnv：缺 apiBaseUrl（provider=mock）只告警 apiBaseUrl', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetConfig.mockReturnValue({})
    assertEnv()
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls[0][0] as string).toContain('apiBaseUrl')
    expect(warn.mock.calls[0][0] as string).not.toContain('llmEndpoint')
    warn.mockRestore()
  })

  it('assertEnv：provider=llm 且缺 llmEndpoint 时一并告警', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockedGetConfig.mockReturnValue({ aiProvider: 'llm' })
    assertEnv()
    expect(warn).toHaveBeenCalled()
    expect(warn.mock.calls[0][0] as string).toContain('apiBaseUrl')
    expect(warn.mock.calls[0][0] as string).toContain('llmEndpoint')
    warn.mockRestore()
  })
})
