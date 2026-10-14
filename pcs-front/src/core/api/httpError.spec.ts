import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosError } from 'axios'

import { runOnError } from './handlers'
import { ERROR_TEXT, type NormalizedApiError } from './errorCode'
import {
  DEFAULT_RETRY,
  IDEMPOTENT_METHODS,
  OK_CODE,
  RETRY_BASE_DELAY,
  WRITE_METHODS,
  dispatchError,
  isRetryableError,
  normalizeError,
} from './httpError'

vi.mock('./handlers', () => ({ runOnError: vi.fn<(error: NormalizedApiError) => void>() }))

const mockedRunOnError = vi.mocked(runOnError)

/** 构造一个极简 AxiosError（仅保留 normalizeError 会用到的字段）。 */
function makeError(partial: Partial<AxiosError> = {}): AxiosError {
  return { name: 'AxiosError', message: '', isAxiosError: true, ...partial } as AxiosError
}

describe('httpError 常量', () => {
  it('导出业务正常码与重试参数', () => {
    expect(OK_CODE).toBe(200)
    expect(DEFAULT_RETRY).toBe(2)
    expect(RETRY_BASE_DELAY).toBe(300)
  })

  it('幂等方法集合不含写方法', () => {
    expect(['get', 'head', 'options'].every((m) => IDEMPOTENT_METHODS.has(m))).toBe(true)
    expect(IDEMPOTENT_METHODS.has('post')).toBe(false)
  })

  it('写方法集合包含 post/put/patch/delete', () => {
    expect(['post', 'put', 'patch', 'delete'].every((m) => WRITE_METHODS.has(m))).toBe(true)
  })
})

describe('isRetryableError', () => {
  it('无响应（断网/超时）可重试', () => {
    expect(isRetryableError(makeError())).toBe(true)
  })

  it('服务端 5xx 可重试', () => {
    expect(isRetryableError(makeError({ response: { status: 500 } as AxiosError['response'] }))).toBe(true)
    expect(isRetryableError(makeError({ response: { status: 503 } as AxiosError['response'] }))).toBe(true)
  })

  it('4xx 不可重试', () => {
    expect(isRetryableError(makeError({ response: { status: 404 } as AxiosError['response'] }))).toBe(false)
    expect(isRetryableError(makeError({ response: { status: 401 } as AxiosError['response'] }))).toBe(false)
  })
})

describe('normalizeError', () => {
  it('取消请求归网络类、静默文案、状态 0', () => {
    const err = normalizeError(makeError({ code: 'ERR_CANCELED' }))
    expect(err).toMatchObject({ kind: 'network', httpStatus: 0, message: ERROR_TEXT.aborted })
    expect(err.raw).toBeDefined()
  })

  it('无响应（断网/超时）归网络类', () => {
    const err = normalizeError(makeError({ code: 'ECONNABORTED' }))
    expect(err).toMatchObject({ kind: 'network', httpStatus: 0, message: ERROR_TEXT.network })
  })

  it('业务错误优先取后端 msg 原文', () => {
    const err = normalizeError(
      makeError({ response: { status: 400, data: { code: 40010, msg: '账号格式有误' } } as AxiosError['response'] }),
    )
    expect(err).toMatchObject({ kind: 'business', httpStatus: 400, bizCode: 40010, message: '账号格式有误' })
  })

  it('业务错误无 msg 时回落缺省文案', () => {
    const err = normalizeError(
      makeError({ response: { status: 400, data: { code: 40000 } } as AxiosError['response'] }),
    )
    expect(err).toMatchObject({ kind: 'business', message: ERROR_TEXT.business })
  })

  it('401/403 归权限类', () => {
    const err = normalizeError(makeError({ response: { status: 401, data: {} } as AxiosError['response'] }))
    expect(err).toMatchObject({ kind: 'permission', httpStatus: 401, message: ERROR_TEXT.permission })
  })

  it('404/500/503 归系统类', () => {
    expect(normalizeError(makeError({ response: { status: 404, data: {} } as AxiosError['response'] })).kind).toBe('system')
    expect(normalizeError(makeError({ response: { status: 500, data: {} } as AxiosError['response'] })).kind).toBe('system')
    expect(normalizeError(makeError({ response: { status: 503, data: {} } as AxiosError['response'] })).kind).toBe('system')
  })
})

describe('dispatchError', () => {
  beforeEach(() => mockedRunOnError.mockClear())
  afterEach(() => mockedRunOnError.mockReset())

  it('silent 时不触发 onError', () => {
    dispatchError(normalizeError(makeError({ response: { status: 500, data: {} } as AxiosError['response'] })), true)
    expect(mockedRunOnError).not.toHaveBeenCalled()
  })

  it('取消请求静默不提示', () => {
    dispatchError(normalizeError(makeError({ code: 'ERR_CANCELED' })), false)
    expect(mockedRunOnError).not.toHaveBeenCalled()
  })

  it('普通错误透传给注入的 onError', () => {
    const normalized = normalizeError(makeError({ response: { status: 500, data: {} } as AxiosError['response'] }))
    dispatchError(normalized, false)
    expect(mockedRunOnError).toHaveBeenCalledTimes(1)
    expect(mockedRunOnError).toHaveBeenCalledWith(normalized)
  })
})
