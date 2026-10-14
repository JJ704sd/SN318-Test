import { nextTick, watch } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { AiAbortError } from '@core/ai/service/AiAbortError'
import type {
  AiAction,
  AiActionResult,
  AiMessage,
  AiSendMessageOptions,
  AiSendMessageResult,
  AiSuggestion,
  AiSuggestionRequest,
} from '@core/ai/service/types'

// mock 掉服务出口，隔离状态机逻辑（不受真实流式/延迟影响）
const { mockService, mockEnv } = vi.hoisted(() => ({
  mockService: {
    sendMessage: vi.fn<(options: AiSendMessageOptions) => Promise<AiSendMessageResult>>(),
    requestSuggestions: vi.fn<(request: AiSuggestionRequest) => Promise<AiSuggestion[]>>(),
    confirmAndExecute: vi.fn<(action: AiAction) => Promise<AiActionResult>>(),
  },
  mockEnv: { aiStatusMinDuration: 0 },
}))
vi.mock('@core/ai/service', () => ({ getAiService: () => mockService }))
vi.mock('@core/config/env', () => ({ env: mockEnv }))

import { configureAiStatusTiming, useAiStore } from './ai'

const sampleAction: AiAction = {
  type: 'batch-update-status',
  payload: { status: 'shipped', count: 128 },
  requireConfirm: true,
  description: '批量将 128 条运单状态修改为「已发货」',
}

function makeReply(content: string): AiMessage {
  return { id: 'm1', role: 'assistant', content, streaming: false, createdAt: Date.now() }
}

describe('useAiStore 状态机', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    mockService.sendMessage.mockReset()
    mockService.requestSuggestions.mockReset()
    mockService.confirmAndExecute.mockReset()
    mockEnv.aiStatusMinDuration = 0
    configureAiStatusTiming()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // ── 三步链红线 ──

  it('proposeAction 只置 awaitingUser、写 pendingAction，不执行', () => {
    const store = useAiStore()
    store.proposeAction(sampleAction)
    expect(store.status).toBe('awaitingUser')
    expect(store.pendingAction).toEqual(sampleAction)
    expect(mockService.confirmAndExecute).not.toHaveBeenCalled()
  })

  it('无 pendingAction 时 confirmExecute 不执行', async () => {
    const store = useAiStore()
    await store.confirmExecute()
    expect(mockService.confirmAndExecute).not.toHaveBeenCalled()
  })

  it('confirmExecute 后才真正执行并清 pendingAction、置 done', async () => {
    mockService.confirmAndExecute.mockResolvedValue({ success: true, data: {} })
    const store = useAiStore()
    store.proposeAction(sampleAction)
    await store.confirmExecute()
    expect(mockService.confirmAndExecute).toHaveBeenCalledWith(sampleAction)
    expect(store.pendingAction).toBeNull()
    expect(store.status).toBe('done')
  })

  it('confirmExecute 执行中置 executing 并维护 activeTool/execProgress', async () => {
    let resolveExec: (v: { success: boolean }) => void = () => {}
    mockService.confirmAndExecute.mockReturnValue(
      new Promise((r) => {
        resolveExec = r
      }),
    )
    const store = useAiStore()
    store.proposeAction(sampleAction)
    const p = store.confirmExecute()
    expect(store.status).toBe('executing')
    expect(store.activeTool).toBe(sampleAction.type)
    expect(store.execProgress).toBe(sampleAction.description)
    resolveExec({ success: true })
    await p
    expect(store.activeTool).toBeNull()
    expect(store.execProgress).toBeNull()
  })

  it('执行失败置 failed 并写 errorReason', async () => {
    mockService.confirmAndExecute.mockResolvedValue({
      success: false,
      errorReason: '执行失败，请稍后重试',
    })
    const store = useAiStore()
    store.proposeAction(sampleAction)
    await store.confirmExecute()
    expect(store.status).toBe('failed')
    expect(store.errorReason).toBe('执行失败，请稍后重试')
  })

  it('cancelAction 清 pendingAction 并从 awaitingUser 回 idle', () => {
    const store = useAiStore()
    store.proposeAction(sampleAction)
    store.cancelAction()
    expect(store.pendingAction).toBeNull()
    expect(store.status).toBe('idle')
  })

  // ── 生成链路 ──

  it('sendMessage 流式增量追加、结束置 done、用户消息入列', async () => {
    const store = useAiStore()
    mockService.sendMessage.mockImplementation(
      async (opts: { onChunk?: (c: { delta: string; done: boolean }) => void }) => {
        opts.onChunk?.({ delta: '你', done: false })
        // 首个增量到达即应进入 streaming
        expect(store.status).toBe('streaming')
        opts.onChunk?.({ delta: '好', done: false })
        opts.onChunk?.({ delta: '', done: true })
        return { message: makeReply('你好') }
      },
    )
    await store.sendMessage('hi')
    expect(store.messages[0]!.role).toBe('user')
    expect(store.messages[0]!.content).toBe('hi')
    const last = store.messages.at(-1)!
    expect(last.role).toBe('assistant')
    expect(last.content).toBe('你好')
    expect(last.streaming).toBe(false)
    expect(store.status).toBe('done')
  })

  it('配置最短停留 3000ms 时按 requesting → thinking → streaming → done 展示', async () => {
    configureAiStatusTiming({ minDuration: 3000 })
    mockService.sendMessage.mockImplementation(async (opts) => {
      opts.onStart?.()
      opts.onChunk?.({ delta: '完成', done: false })
      return { message: makeReply('完成') }
    })
    const store = useAiStore()
    const request = store.sendMessage('hi')
    await Promise.resolve()

    expect(store.status).toBe('requesting')
    await vi.advanceTimersByTimeAsync(2999)
    expect(store.status).toBe('requesting')
    await vi.advanceTimersByTimeAsync(1)
    expect(store.status).toBe('thinking')
    await vi.advanceTimersByTimeAsync(3000)
    expect(store.status).toBe('streaming')
    await vi.advanceTimersByTimeAsync(3000)
    await request
    expect(store.status).toBe('done')
  })

  it('执行接口早于 3000ms 完成时，executing 补足到 3000ms', async () => {
    configureAiStatusTiming({ minDuration: 3000 })
    mockService.confirmAndExecute.mockResolvedValue({ success: true })
    const store = useAiStore()
    store.proposeAction(sampleAction)
    const execution = store.confirmExecute()
    await Promise.resolve()

    expect(store.status).toBe('executing')
    await vi.advanceTimersByTimeAsync(2999)
    expect(store.status).toBe('executing')
    await vi.advanceTimersByTimeAsync(1)
    await execution
    expect(store.status).toBe('done')
  })

  it('执行接口自身超过 3000ms 时不再追加等待', async () => {
    configureAiStatusTiming({ minDuration: 3000 })
    mockService.confirmAndExecute.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 5000)),
    )
    const store = useAiStore()
    store.proposeAction(sampleAction)
    const execution = store.confirmExecute()

    await vi.advanceTimersByTimeAsync(4999)
    expect(store.status).toBe('executing')
    await vi.advanceTimersByTimeAsync(1)
    await execution
    expect(store.status).toBe('done')
  })

  it('人工停止会取消仍在排队的展示状态，不再继续推进链路', async () => {
    configureAiStatusTiming({ minDuration: 3000 })
    mockService.sendMessage.mockImplementation(async (opts) => {
      opts.onStart?.()
      opts.onChunk?.({ delta: '处理中', done: false })
      return { message: makeReply('处理完成') }
    })
    const store = useAiStore()
    const request = store.sendMessage('hi')
    await Promise.resolve()
    store.abort()
    await vi.advanceTimersByTimeAsync(9000)
    await request
    expect(store.status).toBe('aborted')
  })

  it('流式增量写入响应式 assistant 消息，确保每个 chunk 都能驱动气泡更新', async () => {
    let emitChunk: ((chunk: { delta: string; done: boolean }) => void) | undefined
    let resolveReply: ((result: AiSendMessageResult) => void) | undefined
    mockService.sendMessage.mockImplementation(
      (opts: { onChunk?: (chunk: { delta: string; done: boolean }) => void }) =>
        new Promise((resolve) => {
          emitChunk = opts.onChunk
          resolveReply = resolve
        }),
    )
    const store = useAiStore()
    const request = store.sendMessage('hi')
    await nextTick()

    const changes: string[] = []
    const stop = watch(
      () => store.messages.at(-1)?.content,
      (content) => changes.push(content ?? ''),
    )
    emitChunk?.({ delta: '你', done: false })
    await nextTick()
    emitChunk?.({ delta: '好', done: false })
    await nextTick()

    expect(changes).toEqual(['你', '你好'])
    resolveReply?.({ message: makeReply('你好') })
    await request
    stop()
  })

  it('回复携带 action 建议时先停在 done，等待采纳或忽略', async () => {
    const suggestion: AiSuggestion = {
      id: 'sg-reply',
      title: '批量更新为「已发货」',
      description: sampleAction.description,
      action: sampleAction,
      riskLevel: 'high',
      evidence: [{ label: '待更新运单', value: '128 条', source: '运单列表筛选' }],
    }
    mockService.sendMessage.mockResolvedValue({ message: makeReply('待确认'), suggestion })
    const store = useAiStore()
    await store.sendMessage('批量')
    expect(store.status).toBe('done')
    expect(store.chatSuggestion).toEqual(suggestion)
    expect(Object.values(store.chatSuggestions)).toEqual([suggestion])
    expect(store.pendingAction).toBeNull()
    expect(mockService.confirmAndExecute).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1200)
    expect(store.status).toBe('done')
    expect(store.chatSuggestion).toEqual(suggestion)
  })

  it('发送下一条消息时保留上一轮回复关联的建议操作', async () => {
    const suggestion: AiSuggestion = {
      id: 'sg-history',
      title: '批量更新',
      description: sampleAction.description,
      action: sampleAction,
      riskLevel: 'low',
      evidence: [],
    }
    mockService.sendMessage
      .mockResolvedValueOnce({ message: makeReply('建议批量处理'), suggestion })
      .mockResolvedValueOnce({ message: makeReply('这是下一轮回复') })

    const store = useAiStore()
    await store.sendMessage('第一条消息')
    const suggestionMessageId = store.messages.at(-1)!.id

    await store.sendMessage('第二条消息')

    expect(store.chatSuggestions[suggestionMessageId]).toEqual(suggestion)
    expect(store.messages.at(-2)?.content).toBe('第二条消息')
  })

  it('采纳对话建议后才进入 awaitingUser，并留存授权卡所需依据', async () => {
    const suggestion: AiSuggestion = {
      id: 'sg-reply',
      title: '批量更新为「已发货」',
      description: sampleAction.description,
      action: sampleAction,
      riskLevel: 'high',
      evidence: [{ label: '待更新运单', value: '128 条' }],
    }
    mockService.sendMessage.mockResolvedValue({ message: makeReply('待确认'), suggestion })
    const store = useAiStore()
    await store.sendMessage('批量')
    store.acceptChatSuggestion()
    expect(store.chatSuggestion).toBeNull()
    expect(Object.keys(store.chatSuggestions)).toHaveLength(0)
    expect(store.status).toBe('awaitingUser')
    expect(store.pendingAction).toEqual(sampleAction)
    expect(store.pendingSuggestion).toEqual(suggestion)
    expect(mockService.confirmAndExecute).not.toHaveBeenCalled()
  })

  it('忽略对话建议后清理建议并回到 idle', async () => {
    const suggestion: AiSuggestion = {
      id: 'sg-reply',
      title: '批量更新',
      description: sampleAction.description,
      action: sampleAction,
      riskLevel: 'low',
      evidence: [],
    }
    mockService.sendMessage.mockResolvedValue({ message: makeReply('建议批量处理'), suggestion })
    const store = useAiStore()
    await store.sendMessage('批量')
    store.ignoreChatSuggestion()
    expect(store.chatSuggestion).toBeNull()
    expect(Object.keys(store.chatSuggestions)).toHaveLength(0)
    expect(store.pendingAction).toBeNull()
    expect(store.status).toBe('idle')
  })

  it('onStart 把 requesting 切到 thinking（requesting 态不被跳过）', async () => {
    let capturedOnStart: (() => void) | undefined
    mockService.sendMessage.mockImplementation(
      async (opts: { onStart?: () => void }) => {
        capturedOnStart = opts.onStart
        return { message: makeReply('ok') }
      },
    )
    const store = useAiStore()
    const p = store.sendMessage('hi')
    // onStart 触发前应停在 requesting（不再同步跳到 thinking）
    expect(store.status).toBe('requesting')
    capturedOnStart?.()
    expect(store.status).toBe('thinking')
    await p
  })

  it('sendMessage 遇 AiAbortError 落 aborted 而非 failed', async () => {
    mockService.sendMessage.mockRejectedValue(new AiAbortError())
    const store = useAiStore()
    await store.sendMessage('hi')
    expect(store.status).toBe('aborted')
  })

  it('sendMessage 未归一异常落 failed，但不直接暴露技术错误', async () => {
    mockService.sendMessage.mockRejectedValue(new Error('boom'))
    const store = useAiStore()
    await store.sendMessage('hi')
    expect(store.status).toBe('failed')
    expect(store.errorReason).toBe('AI 服务异常，请稍后重试')
  })

  it.each([
    ['network', 'timeoutNetwork'],
    ['server', 'timeoutServer'],
    ['model', 'timeoutModel'],
  ] as const)('sendMessage 接收适配器 %s 归因并落到 %s', async (kind, expected) => {
    mockService.sendMessage.mockRejectedValue({ kind, reason: '面向用户的友好提示' })
    const store = useAiStore()
    await store.sendMessage('hi')
    expect(store.status).toBe(expected)
    expect(store.errorReason).toBe('面向用户的友好提示')
  })

  it('fetchSuggestions 填充 suggestions 并置 done', async () => {
    const list: AiSuggestion[] = [
      { id: 's1', title: 't', description: 'd', riskLevel: 'low', evidence: [] },
    ]
    mockService.requestSuggestions.mockResolvedValue(list)
    const store = useAiStore()
    await store.fetchSuggestions('form.waybill', { foo: 1 })
    expect(store.suggestions).toEqual(list)
    expect(store.status).toBe('done')
    expect(mockService.requestSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({ scene: 'form.waybill', context: { foo: 1 } }),
    )
  })

  // ── 异常链路 ──

  it('abort 置 aborted 中性态，不落 failed', () => {
    const store = useAiStore()
    store.abort()
    expect(store.status).toBe('aborted')
  })

  it.each([
    ['network', 'timeoutNetwork'],
    ['server', 'timeoutServer'],
    ['model', 'timeoutModel'],
  ] as const)('handleTimeout(%s) → %s', (kind, expected) => {
    const store = useAiStore()
    store.handleTimeout(kind)
    expect(store.status).toBe(expected)
  })

  it('handleTimeout(server) 不清 execProgress/activeTool、不引导重试', async () => {
    let resolveExec: (v: { success: boolean }) => void = () => {}
    mockService.confirmAndExecute.mockReturnValue(
      new Promise((r) => {
        resolveExec = r
      }),
    )
    const store = useAiStore()
    store.proposeAction(sampleAction)
    const p = store.confirmExecute()
    store.handleTimeout('server')
    expect(store.status).toBe('timeoutServer')
    expect(store.activeTool).toBe(sampleAction.type)
    expect(store.execProgress).toBe(sampleAction.description)
    resolveExec({ success: true })
    await p
  })

  it('continueWaiting 仅将服务器超时恢复为思考中', () => {
    const store = useAiStore()
    store.handleTimeout('server')
    store.continueWaiting()
    expect(store.status).toBe('thinking')
    store.handleTimeout('network')
    store.continueWaiting()
    expect(store.status).toBe('timeoutNetwork')
  })

  // ── 其他 ──

  it('toggleAssistant 切换开合', () => {
    const store = useAiStore()
    expect(store.assistantOpen).toBe(false)
    store.toggleAssistant()
    expect(store.assistantOpen).toBe(true)
    store.toggleAssistant()
    expect(store.assistantOpen).toBe(false)
  })

  it('resetStatus 复位 idle 并清异常/进度', () => {
    const store = useAiStore()
    store.handleTimeout('network')
    store.resetStatus()
    expect(store.status).toBe('idle')
    expect(store.errorReason).toBeNull()
    expect(store.execProgress).toBeNull()
    expect(store.activeTool).toBeNull()
  })

  it.each([
    'requesting',
    'thinking',
    'streaming',
    'done',
    'executing',
    'awaitingUser',
    'aborted',
    'timeoutNetwork',
    'timeoutServer',
    'timeoutModel',
    'failed',
  ] as const)('previewStatus(%s) 直接切换对应展示态', (status) => {
    const store = useAiStore()
    store.previewStatus(status)
    expect(store.status).toBe(status)
    expect(store.messages.at(-1)?.id).toBe('ai-status-preview')
  })

  it('previewStatus 为生成、完成和等待确认态补齐对应展示数据', () => {
    const store = useAiStore()

    store.previewStatus('streaming')
    expect(store.messages.at(-1)?.streaming).toBe(true)

    store.previewStatus('done')
    expect(store.messages.filter((message) => message.id === 'ai-status-preview')).toHaveLength(1)
    expect(store.chatSuggestion?.action).toBeDefined()

    store.previewStatus('awaitingUser')
    expect(store.pendingAction).not.toBeNull()
    expect(store.pendingSuggestion).not.toBeNull()
  })
})
