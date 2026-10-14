import { computed, ref, shallowRef, watch, type ComputedRef, type Ref } from 'vue'
import { env } from '@core/config'
import { successMsg } from '@core/components'
import type { AiSuggestion, useAiStore as _useAiStore } from '@core/ai'

// 仅类型导入 useAiStore（构建后完全擦除，不把 AI runtime 带进列表路由 chunk，B-04 零静态依赖）。
// 运行时经 ensureStore() 惰性动态 import('/ai') 获取，AI（总开关/内嵌）关闭时不加载任何 AI 代码。
type AiStore = ReturnType<typeof _useAiStore>

/**
 * 列表页 AI 批量动作编排（实施方案任务 5.3 / 规范 §10 嵌入式 AI、§02.2 原则三）。
 *
 * 固化「建议 -> 采纳 -> 待确认 -> 执行」四段链，禁止短路：
 * - fetchSuggestions 只拉建议，不产生副作用；
 * - proposeAction 只把建议转为待确认，不执行；
 * - confirmExecute 由 AiActionBar 内部触发，本 composable 不直接调；
 * - 通过 watch(status) 感知执行完成，回调 onExecuted 刷新列表 + 清空选择。
 *
 * B-04：模块顶层不静态 import AI store，AI 仅在开关开启 + 首次交互时经动态导入惰性实例化，
 * 使 `aiEnabled=false` 时列表路由不请求任何 AI 资源（如基础 /ai 模块、AI Store、adapter）。
 */

const TEXT = {
  applied: '已采纳 AI 建议，请确认后执行',
  executed: '批量操作成功',
}

/** 列表页 AI 批量动作场景 key（mock-data.ts 预设 'list.batch-operation'） */
export const LIST_AI_SCENE = 'list.batch-operation'

export interface UseAiBatchActionOptions<T> {
  /** 当前选中的行 key 列表（清空时关闭遗留建议面板） */
  selectedRowKeys: Ref<string[]>
  /** 当前选中的行数据列表（作为建议上下文传给适配器） */
  selectedRows: Ref<T[]>
  /** 执行成功回调：由视图刷新列表 / 清空选择 */
  onExecuted: () => void
}

export interface UseAiBatchActionReturn {
  /**
   * AI store（惰性加载：首次 AI 交互时才实例化，之前为 null）。体现为 Ref 供模板解包；
   * 内嵌 AI 禁用时恒为 null，调用方以 aiEmbeddedOn 门控 UI。
   */
  aiStore: Ref<AiStore | null>
  aiSuggestions: ComputedRef<AiSuggestion[]>
  aiLoading: ComputedRef<boolean>
  showAiSuggestions: Ref<boolean>
  onFetchAiSuggestions: () => Promise<void>
  onApplySuggestion: (s: AiSuggestion) => void
  onCloseAiSuggestions: () => void
}

export function useAiBatchAction<T>(
  options: UseAiBatchActionOptions<T>,
): UseAiBatchActionReturn {
  // 内嵌 AI 未启用（总开关关或 aiEmbeddedEnabled 关）时返回禁用态：
  // 不创建 AI store、不发 AI 请求、不加载 /ai，调用方据此不挂载 AI UI
  if (!(env.aiEnabled && env.aiEmbeddedEnabled)) {
    return {
      aiStore: shallowRef<AiStore | null>(null),
      aiSuggestions: computed<AiSuggestion[]>(() => []),
      aiLoading: computed(() => false),
      showAiSuggestions: ref(false),
      onFetchAiSuggestions: async () => {},
      onApplySuggestion: () => {},
      onCloseAiSuggestions: () => {},
    }
  }

  // ── 启用态：AI store 惰性加载，仅在首次 AI 交互时动态 import('/ai') 实例化 ──
  const aiStore = shallowRef<AiStore | null>(null)
  let loadingPromise: Promise<AiStore | null> | null = null

  async function ensureStore(): Promise<AiStore | null> {
    if (aiStore.value) return aiStore.value
    if (!loadingPromise) {
      loadingPromise = import('@core/ai').then(({ useAiStore }) =>
        useAiStore(),
      )
    }
    const store = await loadingPromise
    aiStore.value = store ?? null
    return store ?? null
  }

  const aiSuggestions = computed<AiSuggestion[]>(() => aiStore.value?.suggestions ?? [])

  const aiLoading = computed(
    () => aiStore.value?.status === 'requesting' || aiStore.value?.status === 'thinking',
  )

  const showAiSuggestions = ref(false)

  async function onFetchAiSuggestions() {
    const store = await ensureStore()
    if (!store) return
    showAiSuggestions.value = true
    await store.fetchSuggestions(LIST_AI_SCENE, {
      selectedCount: options.selectedRowKeys.value.length,
      selectedRows: options.selectedRows.value,
    })
  }

  function onApplySuggestion(s: AiSuggestion) {
    if (!s.action) return
    const store = aiStore.value
    if (!store) return
    store.proposeAction(s.action, s)
    showAiSuggestions.value = false
    successMsg(TEXT.applied)
  }

  function onCloseAiSuggestions() {
    showAiSuggestions.value = false
  }

  // 选中清空时关闭遗留的建议面板：避免「已选 3 项 -> 拉建议 -> 取消选择」后面板仍挂着
  watch(
    () => options.selectedRowKeys.value,
    (keys) => {
      if (keys.length === 0) showAiSuggestions.value = false
    },
  )

  // 执行完成感知：status 从 executing 落到 done 时认为批量动作成功，
  // 触发 onExecuted 让视图刷新列表 + 清空选择；failed/aborted 保留现场供排查
  const aiStatus = computed(() => aiStore.value?.status)
  watch(aiStatus, (next, prev) => {
    if (prev === 'executing' && next === 'done') {
      successMsg(TEXT.executed)
      showAiSuggestions.value = false
      options.onExecuted()
    }
  })

  return {
    aiStore,
    aiSuggestions,
    aiLoading,
    showAiSuggestions,
    onFetchAiSuggestions,
    onApplySuggestion,
    onCloseAiSuggestions,
  }
}
