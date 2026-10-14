import { ref, shallowRef } from 'vue'

interface UseDetailOptions<T> {
  fetchFn: (id: string) => Promise<T>
}

/**
 * 详情数据获取（组件不直发 API，统一经此 composable）。
 * 页面传入按 id 查询的 fetchFn，负责 loading 态与数据托管；组件只调用 load。
 * clear 用于抽屉/弹窗场景关闭后清空详情态，避免下次打开闪烁旧数据。
 */
export function useDetail<T extends object>(options: UseDetailOptions<T>) {
  const detail = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref(false)

  async function load(id: string) {
    loading.value = true
    error.value = false
    try {
      detail.value = await options.fetchFn(id)
    } catch {
      detail.value = null
      error.value = true
    } finally {
      loading.value = false
    }
  }

  function clear() {
    detail.value = null
    loading.value = false
    error.value = false
  }

  return { detail, loading, error, load, clear }
}
