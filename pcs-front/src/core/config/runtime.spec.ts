import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Runtime = typeof import('./runtime')

/** 每个用例独立模块实例，隔离模块级 cache / inflight。 */
async function loadRuntime(): Promise<Runtime> {
  vi.resetModules()
  return import('./runtime')
}

function jsonResponse(value: unknown) {
  return { ok: true, json: async () => value }
}

describe('runtime 配置加载', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>>()
    vi.stubGlobal('fetch', fetchMock)
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    warnSpy.mockRestore()
  })

  it('按 env.js 标识取对应环境配置', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith('/env.js')
        ? jsonResponse({ env: 'prod' })
        : jsonResponse({ dev: { apiBaseUrl: '/dev' }, prod: { apiBaseUrl: '/prod' } }),
    )
    const r = await loadRuntime()
    await r.loadConfig()
    expect(r.getConfig()?.apiBaseUrl).toBe('/prod')
    expect(r.isLoaded()).toBe(true)
  })

  it('config.js 无该 env 时回落空对象并 warn', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith('/env.js') ? jsonResponse({ env: 'dev' }) : jsonResponse({ test: {} }),
    )
    const r = await loadRuntime()
    await r.loadConfig()
    expect(r.getConfig()).toEqual({})
    expect(r.isLoaded()).toBe(true)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('拉取失败回落 null 并 warn', async () => {
    fetchMock.mockRejectedValue(new Error('网络错误'))
    const r = await loadRuntime()
    await r.loadConfig()
    expect(r.getConfig()).toBeNull()
    expect(r.isLoaded()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('未加载时 getConfig 返回 null', async () => {
    const r = await loadRuntime()
    expect(r.getConfig()).toBeNull()
    expect(r.isLoaded()).toBe(false)
  })

  // ---- 分支补全（cache 早退 / inflight 去重 / 非 ok 响应）----

  it('cache 已填充时再次 loadConfig 直接返回、不重复 fetch', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith('/env.js') ? jsonResponse({ env: 'dev' }) : jsonResponse({ dev: { apiBaseUrl: '/dev' } }),
    )
    const r = await loadRuntime()
    await r.loadConfig()
    await r.loadConfig()
    expect(r.getConfig()?.apiBaseUrl).toBe('/dev')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('并发调用共享同一次 fetch（inflight 去重）', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith('/env.js') ? jsonResponse({ env: 'test' }) : jsonResponse({ test: { apiBaseUrl: '/t' } }),
    )
    const r = await loadRuntime()
    await Promise.all([r.loadConfig(), r.loadConfig()])
    expect(r.getConfig()?.apiBaseUrl).toBe('/t')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('env.js 返回非 ok：抛错回落 null 并 warn', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith('/env.js') ? { ok: false, json: async () => ({}) } : jsonResponse({}),
    )
    const r = await loadRuntime()
    await r.loadConfig()
    expect(r.getConfig()).toBeNull()
    expect(r.isLoaded()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('config.js 返回非 ok：抛错回落 null 并 warn', async () => {
    fetchMock.mockImplementation((url: string) =>
      url.startsWith('/env.js') ? jsonResponse({ env: 'dev' }) : { ok: false, json: async () => ({}) },
    )
    const r = await loadRuntime()
    await r.loadConfig()
    expect(r.getConfig()).toBeNull()
    expect(r.isLoaded()).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })
})
