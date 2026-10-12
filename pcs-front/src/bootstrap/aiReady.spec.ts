import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureAiReady, resetAiReadyForTest } from './aiReady'

const mocks = vi.hoisted(() => {
  return {
    env: { aiEnabled: true, aiProvider: 'mock' } as {
      aiEnabled: boolean
      aiProvider: string
    },
    getConfig: vi.fn<(arg0?: unknown) => { aiStatusMinDuration?: number } | null>(),
    configureAiStatusTiming: vi.fn<(arg0: { minDuration?: number }) => void>(),
    registerAiService: vi.fn<(svc: unknown) => void>(),
    MockAiAdapter: vi.fn<(arg0?: unknown) => unknown>(),
  }
})

vi.mock('@baiyun/template-core/config', () => ({
  env: mocks.env,
  getConfig: mocks.getConfig,
}))

vi.mock('@baiyun/template-core/ai', () => ({
  configureAiStatusTiming: mocks.configureAiStatusTiming,
  MockAiAdapter: mocks.MockAiAdapter,
  registerAiService: mocks.registerAiService,
}))

describe('ensureAiReady AI 初始化门控', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAiReadyForTest()
    mocks.env.aiEnabled = true
    mocks.env.aiProvider = 'mock'
    mocks.getConfig.mockReturnValue({ aiStatusMinDuration: 500 })
  })

  it('总开关关闭 → disabled(aiOff)，不注册任何 AI', async () => {
    mocks.env.aiEnabled = false
    expect(await ensureAiReady()).toEqual({ status: 'disabled', reason: 'aiOff' })
    expect(mocks.registerAiService).not.toHaveBeenCalled()
  })

  it('配置未加载（getConfig 为空）→ disabled(aiOff)', async () => {
    mocks.getConfig.mockReturnValue(null as never)
    expect(await ensureAiReady()).toEqual({ status: 'disabled', reason: 'aiOff' })
    expect(mocks.registerAiService).not.toHaveBeenCalled()
  })

  it('aiProvider=mock → 注册 MockAiAdapter 并返回 ready', async () => {
    const result = await ensureAiReady()
    expect(result).toEqual({ status: 'ready' })
    expect(mocks.configureAiStatusTiming).toHaveBeenCalledWith({ minDuration: 500 })
    expect(mocks.registerAiService).toHaveBeenCalledOnce()
  })

  it('aiProvider 非 mock（如 llm）→ disabled(noAdapter)，生产绝不静默注册 Mock', async () => {
    mocks.env.aiProvider = 'llm'
    expect(await ensureAiReady()).toEqual({ status: 'disabled', reason: 'noAdapter' })
    expect(mocks.registerAiService).not.toHaveBeenCalled()
  })

  it('模块级缓存复用同一 Promise，动态导入只执行一次', async () => {
    const first = ensureAiReady()
    const second = ensureAiReady()
    expect(first).toBe(second)
    expect(await first).toEqual({ status: 'ready' })
    expect(mocks.registerAiService).toHaveBeenCalledOnce()
  })

  it('resetAiReadyForTest 清除缓存后可重走初始化分支', async () => {
    await ensureAiReady()
    expect(mocks.registerAiService).toHaveBeenCalledOnce()

    resetAiReadyForTest()
    mocks.env.aiProvider = 'llm'
    expect(await ensureAiReady()).toEqual({ status: 'disabled', reason: 'noAdapter' })
    expect(mocks.registerAiService).toHaveBeenCalledOnce()
  })
})