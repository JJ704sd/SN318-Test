import { describe, expect, it, vi } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import { createAppRouter, getAppRouter, type RouteAccessDependencies } from './index'

const Page = { template: '<div />' }
const routes: RouteRecordRaw[] = [
  { path: '/', component: Page, meta: { auth: 'public' } },
  { path: '/login', component: Page, meta: { auth: 'public' } },
  { path: '/private', component: Page, meta: { auth: 'authenticated' } },
  { path: '/optional', component: Page, meta: { auth: 'optional' } },
  { path: '/resource', component: Page, meta: { auth: { resourceId: 'page:view' } } },
  { path: '/403', component: Page, meta: { auth: 'public' } },
  { path: '/auth-unavailable', component: Page, meta: { auth: 'public' } },
  { path: '/auth-error', component: Page, meta: { auth: 'public' } },
  { path: '/noauth', component: Page },
]

function makeDependencies(
  overrides: Partial<RouteAccessDependencies> = {},
): RouteAccessDependencies {
  return {
    getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => ({
      authenticated: true as const,
      identity: { subject: 'user:1' },
      csrfToken: 'csrf',
    })),
    hasLocalSession: vi.fn<RouteAccessDependencies['hasLocalSession']>(() => false),
    syncSession: vi.fn<RouteAccessDependencies['syncSession']>(),
    clearSession: vi.fn<RouteAccessDependencies['clearSession']>(),
    ensurePermissions: vi.fn<RouteAccessDependencies['ensurePermissions']>(async () => {}),
    canAccess: vi.fn<RouteAccessDependencies['canAccess']>(() => true),
    handleUnauthenticated: vi.fn<RouteAccessDependencies['handleUnauthenticated']>(() => false),
    notifySessionExpired: vi.fn<RouteAccessDependencies['notifySessionExpired']>(),
    classifyFailure: vi.fn<RouteAccessDependencies['classifyFailure']>(() => ({
      kind: 'unknown',
    })),
    ...overrides,
  }
}

describe('createAppRouter dependency injection', () => {
  it('public 路由不触发认证能力', async () => {
    const dependencies = makeDependencies()
    const router = createAppRouter(routes, dependencies)
    await router.push('/')
    expect(dependencies.getSession).not.toHaveBeenCalled()
  })

  it('认证成功同步 session，资源路由再检查权限', async () => {
    const dependencies = makeDependencies()
    const router = createAppRouter(routes, dependencies)
    await router.push('/resource')
    expect(dependencies.syncSession).toHaveBeenCalledWith(
      expect.objectContaining({ authenticated: true, csrfToken: 'csrf' }),
    )
    expect(dependencies.ensurePermissions).toHaveBeenCalledOnce()
    expect(dependencies.canAccess).toHaveBeenCalledWith('page:view')
    expect(router.currentRoute.value.path).toBe('/resource')
  })

  it('未登录时清理本地态并使用注入的登录目标', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => ({
        authenticated: false,
      })),
      hasLocalSession: vi.fn<RouteAccessDependencies['hasLocalSession']>(() => true),
      handleUnauthenticated: vi.fn<RouteAccessDependencies['handleUnauthenticated']>(
        () => '/login',
      ),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/private')
    expect(dependencies.notifySessionExpired).toHaveBeenCalledOnce()
    expect(dependencies.clearSession).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('权限拒绝和认证服务异常保持原异常路由映射', async () => {
    const denied = makeDependencies({
      canAccess: vi.fn<RouteAccessDependencies['canAccess']>(() => false),
    })
    const deniedRouter = createAppRouter(routes, denied)
    await deniedRouter.push('/resource')
    expect(deniedRouter.currentRoute.value.path).toBe('/403')

    const unavailable = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => {
        throw new Error('unavailable')
      }),
      classifyFailure: vi.fn<RouteAccessDependencies['classifyFailure']>(() => ({
        kind: 'unavailable',
      })),
    })
    const unavailableRouter = createAppRouter(routes, unavailable)
    await unavailableRouter.push('/private')
    expect(unavailable.clearSession).toHaveBeenCalledOnce()
    expect(unavailableRouter.currentRoute.value.path).toBe('/auth-unavailable')
  })

  it('optional 路由在认证服务异常时仍按游客放行', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => {
        throw new Error('offline')
      }),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/optional')
    expect(dependencies.clearSession).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/optional')
  })

  it('getAppRouter 返回最近创建的实例', () => {
    const dependencies = makeDependencies()
    const router = createAppRouter(routes, dependencies)
    expect(getAppRouter()).toBe(router)
  })

  it('无 auth 元信息路由缺省按 authenticated 处理（未登录跳登录）', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => ({
        authenticated: false,
      })),
      handleUnauthenticated: vi.fn<RouteAccessDependencies['handleUnauthenticated']>(
        () => '/login',
      ),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/noauth')
    expect(dependencies.handleUnauthenticated).toHaveBeenCalledWith('/noauth')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('未登录且无本地会话：只清会话、不通知过期', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => ({
        authenticated: false,
      })),
      hasLocalSession: vi.fn<RouteAccessDependencies['hasLocalSession']>(() => false),
      handleUnauthenticated: vi.fn<RouteAccessDependencies['handleUnauthenticated']>(
        () => '/login',
      ),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/private')
    expect(dependencies.notifySessionExpired).not.toHaveBeenCalled()
    expect(dependencies.clearSession).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('认证异常分类为 forbidden：映射 /403（resolveFailureRoute 分支）', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => {
        throw new Error('forbidden')
      }),
      classifyFailure: vi.fn<RouteAccessDependencies['classifyFailure']>(() => ({
        kind: 'forbidden',
      })),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/private')
    expect(dependencies.clearSession).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/403')
  })

  it('认证异常分类为 unauthorized：通知过期并跳登录目标', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => {
        throw new Error('unauthorized')
      }),
      classifyFailure: vi.fn<RouteAccessDependencies['classifyFailure']>(() => ({
        kind: 'unauthorized',
      })),
      handleUnauthenticated: vi.fn<RouteAccessDependencies['handleUnauthenticated']>(
        () => '/login',
      ),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/private')
    expect(dependencies.notifySessionExpired).toHaveBeenCalledOnce()
    expect(dependencies.clearSession).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('认证异常归类未知且带 traceId：映射 /auth-error 并携带 trace_id', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => {
        throw new Error('boom')
      }),
      classifyFailure: vi.fn<RouteAccessDependencies['classifyFailure']>(() => ({
        kind: 'unknown',
        traceId: 'trace-1',
      })),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/private')
    expect(router.currentRoute.value.path).toBe('/auth-error')
    expect(router.currentRoute.value.query.trace_id).toBe('trace-1')
  })

  it('认证异常归类未知且无 traceId：不携带 trace_id', async () => {
    const dependencies = makeDependencies({
      getSession: vi.fn<RouteAccessDependencies['getSession']>(async () => {
        throw new Error('boom')
      }),
      classifyFailure: vi.fn<RouteAccessDependencies['classifyFailure']>(() => ({
        kind: 'unknown',
      })),
    })
    const router = createAppRouter(routes, dependencies)
    await router.push('/private')
    expect(router.currentRoute.value.path).toBe('/auth-error')
    expect(router.currentRoute.value.query.trace_id).toBeUndefined()
  })

  it('optional 路由在认证服务正常时：处理会话后仍放行（policy===optional 且无异常分支）', async () => {
    const dependencies = makeDependencies()
    const router = createAppRouter(routes, dependencies)
    await router.push('/optional')
    expect(dependencies.syncSession).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/optional')
  })

  it('authenticated 路由认证成功且非 resource 策略：直接放行（isResourcePolicy 为假分支）', async () => {
    const dependencies = makeDependencies()
    const router = createAppRouter(routes, dependencies)
    await router.push('/private')
    expect(dependencies.syncSession).toHaveBeenCalled()
    expect(dependencies.ensurePermissions).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/private')
  })
})
