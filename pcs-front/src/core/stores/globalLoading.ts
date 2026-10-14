import { ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * 全局 Loading 能力 store。
 */
export const useGlobalLoadingStore = defineStore('global-loading', () => {
  const globalLoading = ref(false)

  function setGlobalLoading(loading: boolean) {
    globalLoading.value = loading
  }

  return {
    globalLoading,
    setGlobalLoading,
  }
})
