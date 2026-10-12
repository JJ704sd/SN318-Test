import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loadNavigationLoading() {
  return import('./useRouteNavigationLoading')
}

describe('useRouteNavigationLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T00:00:00.000Z'))
  })

  afterEach(async () => {
    const { resetRouteNavigationLoading } = await loadNavigationLoading()
    resetRouteNavigationLoading()
    vi.useRealTimers()
  })

  it('当前导航的骨架至少显示 100ms', async () => {
    const {
      finishRouteNavigationLoading,
      isInitialRouteNavigationLoading,
      isRouteNavigationLoading,
      startRouteNavigationLoading,
    } = await loadNavigationLoading()

    startRouteNavigationLoading('/demo/list')
    expect(isInitialRouteNavigationLoading.value).toBe(true)
    finishRouteNavigationLoading('/demo/list')

    vi.advanceTimersByTime(99)
    expect(isRouteNavigationLoading.value).toBe(true)

    vi.advanceTimersByTime(1)
    expect(isRouteNavigationLoading.value).toBe(false)
    expect(isInitialRouteNavigationLoading.value).toBe(false)
  })

  it('旧导航不能提前结束当前导航的骨架', async () => {
    const { finishRouteNavigationLoading, isRouteNavigationLoading, startRouteNavigationLoading } =
      await loadNavigationLoading()

    startRouteNavigationLoading('/demo/list')
    startRouteNavigationLoading('/demo/dashboard')
    finishRouteNavigationLoading('/demo/list')

    vi.advanceTimersByTime(100)
    expect(isRouteNavigationLoading.value).toBe(true)

    finishRouteNavigationLoading('/demo/dashboard')
    vi.advanceTimersByTime(100)
    expect(isRouteNavigationLoading.value).toBe(false)
  })

  it('Router 钩子在导航开始、结束和异常时管理骨架状态', async () => {
    const { isRouteNavigationLoading, registerRouteNavigationLoading } =
      await loadNavigationLoading()

    type NavigationHook = (to: { fullPath: string }) => unknown
    let beforeNavigation: NavigationHook | undefined
    let afterNavigation: NavigationHook | undefined
    let handleRouteError: (() => unknown) | undefined
    const router = {
      beforeEach(hook: NavigationHook) {
        beforeNavigation = hook
        return () => undefined
      },
      afterEach(hook: NavigationHook) {
        afterNavigation = hook
        return () => undefined
      },
      onError(hook: () => unknown) {
        handleRouteError = hook
        return () => undefined
      },
    }

    registerRouteNavigationLoading(router as never)
    beforeNavigation?.({ fullPath: '/demo/detail?id=wb-1' })
    expect(isRouteNavigationLoading.value).toBe(true)

    afterNavigation?.({ fullPath: '/demo/detail?id=wb-1' })
    vi.advanceTimersByTime(100)
    expect(isRouteNavigationLoading.value).toBe(false)

    beforeNavigation?.({ fullPath: '/demo/dashboard' })
    handleRouteError?.()
    expect(isRouteNavigationLoading.value).toBe(false)
  })
})
