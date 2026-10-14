import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NormalizedApiError } from './errorCode'

type Handlers = typeof import('./handlers')

/** 每个用例独立模块实例，隔离 handlers 槽 / warn 去重 / unauthorizedInFlight 单飞状态。 */
async function loadHandlers(): Promise<Handlers> {
  vi.resetModules()
  return import('./handlers')
}

function makeError(): NormalizedApiError {
  return { kind: 'system', httpStatus: 500, message: '系统繁忙，请稍后重试' }
}

describe('api handlers（依赖反转层）', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('未注册 onError 时静默一次警告、不抛错', async () => {
    const h = await loadHandlers()
    h.runOnError(makeError())
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('注册 onError 后 runOnError 透传归一化错误', async () => {
    const h = await loadHandlers()
    const onError = vi.fn<(error: NormalizedApiError) => void>()
    h.configureApiHandlers({ onError })
    const err = makeError()
    h.runOnError(err)
    expect(onError).toHaveBeenCalledWith(err)
  })

  it('onError 自身抛错仅 console.error、不影响调用方', async () => {
    const h = await loadHandlers()
    const boom = new Error('onError 崩了')
    h.configureApiHandlers({ onError: vi.fn<(error: NormalizedApiError) => void>(() => { throw boom }) })
    expect(() => h.runOnError(makeError())).not.toThrow()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('未注册 onUnauthorized 时警告', async () => {
    const h = await loadHandlers()
    h.runOnUnauthorized()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('并发 401 单飞：相邻多次只触发一次 onUnauthorized', async () => {
    const h = await loadHandlers()
    const onUnauthorized = vi.fn<() => void>()
    h.configureApiHandlers({ onUnauthorized })
    h.runOnUnauthorized()
    h.runOnUnauthorized()
    h.runOnUnauthorized()
    await Promise.resolve()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('注册 onCsrfStale 后 runOnCsrfStale 触发一次', async () => {
    const h = await loadHandlers()
    const onCsrfStale = vi.fn<() => void>()
    h.configureApiHandlers({ onCsrfStale })
    h.runOnCsrfStale()
    await Promise.resolve()
    expect(onCsrfStale).toHaveBeenCalledTimes(1)
  })
})
