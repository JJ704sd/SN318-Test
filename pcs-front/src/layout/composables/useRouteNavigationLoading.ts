import { computed, readonly, ref } from 'vue'
import type { Router } from 'vue-router'

export const MIN_ROUTE_NAVIGATION_LOADING_MS = 100

const routeNavigationLoading = ref(false)
const initialRouteNavigationFinished = ref(false)
let activeRouteKey = ''
let startedAt = 0
let finishTimer: ReturnType<typeof setTimeout> | undefined

export const isRouteNavigationLoading = readonly(routeNavigationLoading)
/** 首次路由初始化期间才替换侧栏；后续切页继续保留可用导航。 */
export const isInitialRouteNavigationLoading = computed(
  () => routeNavigationLoading.value && !initialRouteNavigationFinished.value,
)

function clearFinishTimer() {
  if (finishTimer !== undefined) {
    clearTimeout(finishTimer)
    finishTimer = undefined
  }
}

function stopRouteNavigationLoading() {
  clearFinishTimer()
  activeRouteKey = ''
  startedAt = 0
  routeNavigationLoading.value = false
}

export function resetRouteNavigationLoading() {
  stopRouteNavigationLoading()
  initialRouteNavigationFinished.value = false
}

export function startRouteNavigationLoading(routeKey: string) {
  clearFinishTimer()
  activeRouteKey = routeKey
  startedAt = Date.now()
  routeNavigationLoading.value = true
}

export function finishRouteNavigationLoading(routeKey: string) {
  if (!routeNavigationLoading.value || activeRouteKey !== routeKey) return

  const remaining = Math.max(0, MIN_ROUTE_NAVIGATION_LOADING_MS - (Date.now() - startedAt))
  clearFinishTimer()
  finishTimer = setTimeout(() => {
    if (activeRouteKey === routeKey) {
      stopRouteNavigationLoading()
      initialRouteNavigationFinished.value = true
    }
  }, remaining)
}

export function registerRouteNavigationLoading(
  router: Pick<Router, 'beforeEach' | 'afterEach' | 'onError'>,
) {
  router.beforeEach((to) => {
    startRouteNavigationLoading(to.fullPath)
  })
  router.afterEach((to) => {
    finishRouteNavigationLoading(to.fullPath)
  })
  router.onError(() => {
    stopRouteNavigationLoading()
    initialRouteNavigationFinished.value = true
  })
}
