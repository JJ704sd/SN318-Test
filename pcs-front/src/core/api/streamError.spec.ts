import { describe, it, expect } from 'vitest'
import { resolveStreamError, isAbortError, STREAM_ERROR_TEXT } from './streamError'
import { ERROR_TEXT } from './errorCode'

describe('streamError 归因映射（任务 5.1B）', () => {
  it('中断（abort）→ aborted 中性态，不进 failed', () => {
    const result = resolveStreamError({ phase: 'abort' })
    expect(result.kind).toBe('aborted')
    expect(result.reason).toBe(ERROR_TEXT.aborted)
  })

  it('首包超时 → timeoutModel（模型未响应）', () => {
    const result = resolveStreamError({ phase: 'firstByteTimeout' })
    expect(result.kind).toBe('model')
    expect(result.reason).toBe(STREAM_ERROR_TEXT.firstByteTimeout)
  })

  it('空闲超时 → timeoutServer（服务端仍在处理）', () => {
    const result = resolveStreamError({ phase: 'idleTimeout' })
    expect(result.kind).toBe('server')
    expect(result.reason).toBe(STREAM_ERROR_TEXT.idleTimeout)
  })

  it('断网（fetch reject）→ timeoutNetwork', () => {
    const result = resolveStreamError({ phase: 'network' })
    expect(result.kind).toBe('network')
    expect(result.reason).toBe(ERROR_TEXT.network)
  })

  it('HTTP 5xx → server；4xx → failed', () => {
    expect(resolveStreamError({ phase: 'httpError', status: 503 }).kind).toBe('server')
    expect(resolveStreamError({ phase: 'httpError', status: 500 }).kind).toBe('server')
    expect(resolveStreamError({ phase: 'httpError', status: 401 }).kind).toBe('failed')
    expect(resolveStreamError({ phase: 'httpError', status: 400 }).kind).toBe('failed')
  })

  it('流内 error 事件 → failed，优先用后端友好文案', () => {
    const result = resolveStreamError({ phase: 'streamEvent', message: '模型额度已用尽' })
    expect(result.kind).toBe('failed')
    expect(result.reason).toBe('模型额度已用尽')
  })

  it('流内 error 无文案 / 解析异常 → failed 兜底文案', () => {
    expect(resolveStreamError({ phase: 'streamEvent' }).reason).toBe(STREAM_ERROR_TEXT.failed)
    expect(resolveStreamError({ phase: 'parse' }).kind).toBe('failed')
  })

  it('归因文案不暴露堆栈 / 错误码（纯友好文案）', () => {
    const reasons = [
      resolveStreamError({ phase: 'firstByteTimeout' }).reason,
      resolveStreamError({ phase: 'httpError', status: 500 }).reason,
      resolveStreamError({ phase: 'network' }).reason,
    ]
    for (const reason of reasons) {
      expect(reason).not.toMatch(/\d{3}|Error|stack|undefined/i)
    }
  })

  it('isAbortError 识别 AbortError DOMException', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('other'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
  })
})
