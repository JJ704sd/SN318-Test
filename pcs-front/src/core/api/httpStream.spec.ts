import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { streamChat, type StreamEvent } from './httpStream'
import { useUserStore } from '@core/stores/user'
import { configureApiHandlers } from './handlers'
import { clearCsrfToken, setCsrfToken } from '@core/utils/csrf'

// 401 经注入的 onUnauthorized 响应（./handlers）：注册 spy 断言触发、避免真实跳转。
const onUnauthorizedMock = vi.fn<() => void>(() => {})

const encoder = new TextEncoder()

/** 用给定的 chunk 分片构造一个可读流 Response（模拟粘包/半包：调用方自行切分）。 */
function streamResponse(
  chunks: string[],
  init: { status?: number; contentType?: string } = {},
): Response {
  let i = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]))
        i += 1
      } else {
        controller.close()
      }
    },
  })
  return new Response(body, {
    status: init.status ?? 200,
    headers: { 'content-type': init.contentType ?? 'text/event-stream' },
  })
}

/** 收集 handlers 回调结果，便于断言。 */
function collectHandlers() {
  const chunks: string[] = []
  const events: StreamEvent[] = []
  return {
    onOpen: vi.fn<() => void>(() => {}),
    onChunk: (d: string) => chunks.push(d),
    onEvent: (e: StreamEvent) => events.push(e),
    onError: vi.fn<(error: unknown) => void>(),
    onDone: vi.fn<(full: string) => void>(),
    chunks,
    events,
  }
}

describe('httpStream · streamChat（任务 5.1B）', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    onUnauthorizedMock.mockReset()
    configureApiHandlers({ onUnauthorized: () => onUnauthorizedMock() })
    clearCsrfToken()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    configureApiHandlers({})
  })

  it('用 fetch 发起 POST，body 带 messages，注入 X-CSRF-Token 与 X-Request-Id', async () => {
    setCsrfToken('csrf-token-abc')
    useUserStore().setUserInfo({ subject: 'user:abc' })
    const fetchMock = vi.fn<(_url: string, init: RequestInit) => Promise<Response>>(
      async (_url: string, init: RequestInit) => {
        const body = JSON.parse(init.body as string)
        expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
        expect(init.method).toBe('POST')
        const headers = init.headers as Headers
        expect(headers.get('X-CSRF-Token')).toBe('csrf-token-abc')
        expect(headers.get('X-Request-Id')).toBeTruthy()
        return streamResponse(['data: {"delta":"你好"}\n\n', 'data: [DONE]\n\n'])
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const h = collectHandlers()
    await streamChat({ messages: [{ role: 'user', content: 'hi' }] }, h).done
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(h.onDone).toHaveBeenCalledWith('你好')
  })

  it('SSE 逐帧 -> [DONE]：增量拼接、onOpen/onDone 触发', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamResponse([
          'data: {"delta":"运"}\n\n',
          'data: {"delta":"单"}\n\n',
          'data: [DONE]\n\n',
        ]),
      ),
    )
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.onOpen).toHaveBeenCalledOnce()
    expect(h.chunks).toEqual(['运', '单'])
    expect(h.onDone).toHaveBeenCalledWith('运单')
    expect(h.onError).not.toHaveBeenCalled()
  })

  it('粘包/半包：chunk 边界≠消息边界仍能正确拆帧', async () => {
    // 单个 read 里塞两帧（粘包）+ 一帧被拆成两个 read（半包）
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamResponse([
          'data: {"delta":"A"}\n\ndata: {"del',
          'ta":"B"}\n\ndata: {"delta":"C"}\n\ndata: [DONE]\n\n',
        ]),
      ),
    )
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.chunks).toEqual(['A', 'B', 'C'])
    expect(h.onDone).toHaveBeenCalledWith('ABC')
  })

  it('NDJSON 备选协议：逐行 JSON 解析', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamResponse(['{"delta":"x"}\n{"delta":"y"}\n[DONE]\n'], {
          contentType: 'application/x-ndjson',
        }),
      ),
    )
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.chunks).toEqual(['x', 'y'])
    expect(h.onDone).toHaveBeenCalledWith('xy')
  })

  it('结构化事件走 onEvent，不混入文本增量', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamResponse([
          'data: {"event":{"type":"tool","name":"queryWaybill"}}\n\n',
          'data: {"delta":"完成"}\n\n',
          'data: [DONE]\n\n',
        ]),
      ),
    )
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.events).toEqual([{ type: 'tool', name: 'queryWaybill' }])
    expect(h.chunks).toEqual(['完成'])
  })

  it('中断：signal.abort -> onError kind=aborted，不进 failed', async () => {
    const ac = new AbortController()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        // 模拟 fetch 在收到 abort 信号时 reject AbortError
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        })
      }),
    )
    const h = collectHandlers()
    const handle = streamChat({ messages: [], signal: ac.signal }, h)
    ac.abort()
    await handle.done
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'aborted' }))
  })

  it('断网：fetch reject -> onError kind=network', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'network' }))
    expect(h.onDone).not.toHaveBeenCalled()
  })

  it('HTTP 5xx -> onError kind=server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamResponse([], { status: 503 })))
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'server' }))
  })

  it('流内 error 事件 -> onError kind=failed，带后端文案', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamResponse(['data: {"error":{"message":"额度不足"}}\n\n'])),
    )
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.onError).toHaveBeenCalledWith({ kind: 'failed', reason: '额度不足' })
  })

  it('401（非 skipAuth）触发注入的 onUnauthorized、不重连、归 failed', async () => {
    setCsrfToken('csrf-token')
    useUserStore().setUserInfo({ subject: 'user:abc' })
    const fetchMock = vi.fn<() => Promise<Response>>(async () => new Response(null, { status: 401 }))
    vi.stubGlobal('fetch', fetchMock)

    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(onUnauthorizedMock).toHaveBeenCalledOnce()
    expect(h.onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'failed' }))
  })

  it('skipAuth：不注入 X-CSRF-Token、401 不触发 onUnauthorized', async () => {
    setCsrfToken('csrf-token')
    useUserStore().setUserInfo({ subject: 'user:abc' })
    const fetchMock = vi.fn<(_url: string, init: RequestInit) => Promise<Response>>(
      async (_url: string, init: RequestInit) => {
        expect((init.headers as Headers).get('X-CSRF-Token')).toBeNull()
        return new Response(null, { status: 401 })
      },
    )
    vi.stubGlobal('fetch', fetchMock)

    const h = collectHandlers()
    await streamChat({ messages: [], meta: { skipAuth: true } }, h).done
    expect(onUnauthorizedMock).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('后端未显式 [DONE] 直接关闭连接：按已收内容正常收流', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => streamResponse(['data: {"delta":"半截"}\n\n'])),
    )
    const h = collectHandlers()
    await streamChat({ messages: [] }, h).done
    expect(h.onDone).toHaveBeenCalledWith('半截')
  })
})
