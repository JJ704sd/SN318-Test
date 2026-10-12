import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiSuggestion } from '@baiyun/template-core/ai'
import { useAiBatchAction } from './useAiBatchAction'

const envMock = vi.hoisted(() => ({ aiEnabled: false, aiEmbeddedEnabled: false }))
const storeMocks = vi.hoisted(() => ({
  useAiStore: vi.fn<() => FakeAiStore>(),
}))

vi.mock('@baiyun/template-core/config', () => ({
  env: {
    get aiEnabled() {
      return envMock.aiEnabled
    },
    get aiEmbeddedEnabled() {
      return envMock.aiEmbeddedEnabled
    },
  },
}))

vi.mock('@baiyun/template-core/ai', () => ({
  useAiStore: storeMocks.useAiStore,
}))

type FakeAiStore = {
  /* 对齐 Pinia setup store 语义：state 以解包后的值暴露（非 Ref），操作经 action 变更 */
  suggestions: AiSuggestion[]
  status: string
  fetchSuggestions: ReturnType<typeof vi.fn>
  proposeAction: ReturnType<typeof vi.fn>
}

type Row = { id: string }

function makeFakeStore() {
  const state = { suggestions: [] as AiSuggestion[], status: 'idle' as string }
  const store: FakeAiStore = {
    get suggestions() {
      return state.suggestions
    },
    set suggestions(value: AiSuggestion[]) {
      state.suggestions = value
    },
    get status() {
      return state.status
    },
    fetchSuggestions: vi.fn<() => Promise<void>>(async () => {
      state.suggestions = [{ title: '建议 A', description: 'desc' } as AiSuggestion]
    }),
    proposeAction: vi.fn<() => void>(),
  }
  return store
}

function makeOptions() {
  return {
    selectedRowKeys: ref<string[]>(['1']),
    selectedRows: ref<Row[]>([{ id: '1' }]),
    onExecuted: vi.fn<() => void>(),
  }
}

describe('useAiBatchAction（总开关/内嵌子开关矩阵 + AI 惰性加载）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('总开关关闭：返回禁用态，不创建 AI store、不发 AI 请求', async () => {
    envMock.aiEnabled = false
    envMock.aiEmbeddedEnabled = true
    const r = useAiBatchAction<Row>(makeOptions())
    expect(r.aiStore.value).toBeNull()
    expect(r.showAiSuggestions.value).toBe(false)
    expect(r.aiLoading.value).toBe(false)
    // noop 调用均不抛、不触碰 AI store
    await expect(r.onFetchAiSuggestions()).resolves.toBeUndefined()
    expect(storeMocks.useAiStore).not.toHaveBeenCalled()
    expect(() => r.onApplySuggestion({} as never)).not.toThrow()
  })

  it('总开关开启但内嵌子开关关闭：同样返回禁用态', async () => {
    envMock.aiEnabled = true
    envMock.aiEmbeddedEnabled = false
    const r = useAiBatchAction<Row>(makeOptions())
    expect(r.aiStore.value).toBeNull()
    expect(r.onApplySuggestion({} as never)).toBeUndefined()
    expect(storeMocks.useAiStore).not.toHaveBeenCalled()
  })

  it('总开关与内嵌开关均开启：AI store 惰性加载，拉取建议置 showAiSuggestions', async () => {
    const store = makeFakeStore()
    storeMocks.useAiStore.mockReturnValue(store)
    envMock.aiEnabled = true
    envMock.aiEmbeddedEnabled = true

    const r = useAiBatchAction<Row>(makeOptions())
    // B-04 惰性：调用 composable 时不实例化 AI store（不经 /ai），首次交互才动态加载
    expect(storeMocks.useAiStore).not.toHaveBeenCalled()
    expect(r.aiStore.value).toBeNull()
    expect(r.aiLoading.value).toBe(false)

    await r.onFetchAiSuggestions()
    expect(storeMocks.useAiStore).toHaveBeenCalledTimes(1)
    expect(r.aiStore.value).toBe(store)
    expect(r.showAiSuggestions.value).toBe(true)
    expect(store.fetchSuggestions).toHaveBeenCalled()
    expect(r.aiSuggestions.value.length).toBeGreaterThan(0)
  })
})