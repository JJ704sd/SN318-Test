import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthCoordinator } from './auth'

const mocks = vi.hoisted(() => {
  class MockBffError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code: number,
      readonly traceId: string,
    ) {
      super(message)
    }
  }

  return {
    MockBffError,
    env: { useMockAuth: true },
    getSession: vi.fn<() => Promise<unknown>>(),
    getFrontendProfile: vi.fn<(force?: boolean) => Promise<unknown>>(),
    setCsrfToken: vi.fn<(token: string) => void>(),
    clearCsrfToken: vi.fn<() => void>(),
    broadcastAuthEvent: vi.fn<(type: 'logout' | 'session-expired') => void>(),
    subscribeAuthEvents:
      vi.fn<
        (listener: (event: { type: 'logout' | 'session-expired'; timestamp: number }) => void) =>
          () => void
      >(),
    userStore: {
      userInfo: null as unknown,
      isLoggedIn: false,
      setUserInfo: vi.fn<(identity: unknown) => void>(),
      logout: vi.fn<() => void>(),
    },
    permissionStore: {
      loaded: false,
      clear: vi.fn<() => void>(),
      can: vi.fn<(resourceId?: string) => boolean>(() => true),
      applyProfile: vi.fn<(profile: unknown) => void>(),
      setLoading: vi.fn<(loading: boolean) => void>(),
      setError: vi.fn<(error: unknown) => void>(),
    },
  }
})

vi.mock('@core/auth', () => ({
  BffError: mocks.MockBffError,
  broadcastAuthEvent: mocks.broadcastAuthEvent,
  clearCsrfToken: mocks.clearCsrfToken,
  getFrontendProfile: mocks.getFrontendProfile,
  getSession: mocks.getSession,
  setCsrfToken: mocks.setCsrfToken,
  subscribeAuthEvents: mocks.subscribeAuthEvents,
}))

vi.mock('@core/config', () => ({ env: mocks.env }))
vi.mock('@core/stores', () => ({
  useUserStore: () => mocks.userStore,
  usePermissionStore: () => mocks.permissionStore,
}))

describe('auth bootstrap coordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.env.useMockAuth = true
    mocks.userStore.isLoggedIn = false
    mocks.permissionStore.loaded = false
    mocks.permissionStore.can.mockReturnValue(true)
    mocks.subscribeAuthEvents.mockReturnValue(vi.fn())
  })

  it('把认证 session 映射到 Router 端口并同步 Store/CSRF', async () => {
    mocks.getSession.mockResolvedValue({
      authenticated: true,
      identity: { subject: 'user:1' },
      csrf_token: 'csrf-1',
    })
    const coordinator = createAuthCoordinator({} as Pinia)
    const session = await coordinator.routeAccess.getSession()
    expect(session).toEqual({
      authenticated: true,
      identity: { subject: 'user:1' },
      csrfToken: 'csrf-1',
    })
    if (session.authenticated) coordinator.routeAccess.syncSession(session)
    expect(mocks.userStore.setUserInfo).toHaveBeenCalledWith({ subject: 'user:1' })
    expect(mocks.setCsrfToken).toHaveBeenCalledWith('csrf-1')
  })

  it('通过注入 loader 加载并转换权限画像', async () => {
    mocks.getFrontendProfile.mockResolvedValue({
      subject: 'user:1',
      system_code: 'demo',
      environment: 'test',
      permission_version: 'v1',
      resource_ids: ['page:view'],
      ttl_seconds: 60,
    })
    const coordinator = createAuthCoordinator({} as Pinia)
    await coordinator.routeAccess.ensurePermissions()
    expect(mocks.getFrontendProfile).toHaveBeenCalledWith(false)
    expect(mocks.permissionStore.applyProfile).toHaveBeenCalledWith({
      subject: 'user:1',
      systemCode: 'demo',
      environment: 'test',
      permissionVersion: 'v1',
      resourceIds: ['page:view'],
      ttlSeconds: 60,
    })
  })

  it('权限加载并发去重，TTL 有效时复用快照', async () => {
    let resolveProfile: ((value: unknown) => void) | undefined
    mocks.getFrontendProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve
      }),
    )
    const coordinator = createAuthCoordinator({} as Pinia)
    const first = coordinator.routeAccess.ensurePermissions()
    const second = coordinator.routeAccess.ensurePermissions()
    expect(mocks.getFrontendProfile).toHaveBeenCalledOnce()
    resolveProfile?.({
      subject: 'user:1',
      system_code: 'demo',
      environment: 'test',
      permission_version: 'v1',
      resource_ids: ['page:view'],
      ttl_seconds: 60,
    })
    await Promise.all([first, second])
    mocks.permissionStore.loaded = true
    await coordinator.routeAccess.ensurePermissions()
    expect(mocks.getFrontendProfile).toHaveBeenCalledOnce()
  })

  it('清理会话后丢弃仍在返回途中的旧权限画像', async () => {
    let resolveProfile: ((value: unknown) => void) | undefined
    mocks.getFrontendProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve
      }),
    )
    const coordinator = createAuthCoordinator({} as Pinia)
    const loading = coordinator.routeAccess.ensurePermissions()

    coordinator.clearSession()
    resolveProfile?.({
      subject: 'user:1',
      system_code: 'demo',
      environment: 'test',
      permission_version: 'v1',
      resource_ids: ['page:view'],
      ttl_seconds: 60,
    })
    await loading

    expect(mocks.permissionStore.clear).toHaveBeenCalledOnce()
    expect(mocks.permissionStore.applyProfile).not.toHaveBeenCalled()
    expect(mocks.permissionStore.setLoading).not.toHaveBeenLastCalledWith(false)
  })

  it('权限加载失败写入错误并结束 loading', async () => {
    const error = new Error('profile failed')
    mocks.getFrontendProfile.mockRejectedValue(error)
    const coordinator = createAuthCoordinator({} as Pinia)
    await expect(coordinator.routeAccess.ensurePermissions()).rejects.toBe(error)
    expect(mocks.permissionStore.setError).toHaveBeenCalledWith(error)
    expect(mocks.permissionStore.setLoading).toHaveBeenLastCalledWith(false)
  })

  it('未认证时统一返回登录页，重复触发只保留第一次回跳地址', () => {
    const mockCoordinator = createAuthCoordinator({} as Pinia)
    expect(mockCoordinator.routeAccess.handleUnauthenticated('/private')).toEqual({
      path: '/login',
      query: { redirect: '/private' },
    })

    const realCoordinator = createAuthCoordinator({} as Pinia)
    expect(realCoordinator.routeAccess.handleUnauthenticated('/a')).toEqual({
      path: '/login',
      query: { redirect: '/a' },
    })
    expect(realCoordinator.routeAccess.handleUnauthenticated('/b')).toBe(false)
  })

  it('并发 API 401 只清理并跳转一次', () => {
    const router = {
      currentRoute: { value: { path: '/private' } },
      push: vi.fn<(target: unknown) => unknown>(),
    }
    const coordinator = createAuthCoordinator({} as Pinia)

    coordinator.redirectUnauthenticated(router as unknown as Router, '/private')
    coordinator.redirectUnauthenticated(router as unknown as Router, '/private')

    expect(mocks.userStore.logout).toHaveBeenCalledOnce()
    expect(mocks.permissionStore.clear).toHaveBeenCalledOnce()
    expect(mocks.clearCsrfToken).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/private' },
    })
  })

  it('跨标签事件清理状态并跳登录，dispose 透传给调用方', () => {
    const dispose = vi.fn<() => void>()
    mocks.subscribeAuthEvents.mockReturnValue(dispose)
    const router = {
      currentRoute: { value: { path: '/private' } },
      push: vi.fn<(target: string) => unknown>(),
    }
    const coordinator = createAuthCoordinator({} as Pinia)
    const stop = coordinator.listenAuthEvents(router as unknown as Router)
    const listener = mocks.subscribeAuthEvents.mock.calls[0]?.[0]
    listener?.({ type: 'logout', timestamp: 1 })
    listener?.({ type: 'session-expired', timestamp: 2 })
    expect(mocks.userStore.logout).toHaveBeenCalledOnce()
    expect(mocks.permissionStore.clear).toHaveBeenCalledOnce()
    expect(mocks.clearCsrfToken).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith('/login')
    stop()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('认证错误分类保持 Router 异常映射所需信息', () => {
    const coordinator = createAuthCoordinator({} as Pinia)
    expect(
      coordinator.routeAccess.classifyFailure(
        new mocks.MockBffError('unauthorized', 401, 1, 't1'),
      ),
    ).toEqual({ kind: 'unauthorized', traceId: 't1' })
    expect(
      coordinator.routeAccess.classifyFailure(
        new mocks.MockBffError('unavailable', 503, 1, 't2'),
      ),
    ).toEqual({ kind: 'unavailable', traceId: 't2' })
  })

  it('hasLocalSession / canAccess 读取用户会话与资源权限端口', () => {
    const coordinator = createAuthCoordinator({} as Pinia)
    mocks.userStore.isLoggedIn = true
    expect(coordinator.routeAccess.hasLocalSession()).toBe(true)
    expect(coordinator.routeAccess.canAccess('operation:demo.view')).toBe(true)
    expect(mocks.permissionStore.can).toHaveBeenCalledWith('operation:demo.view')
  })

  it('notifySessionExpired 只广播一次，重复通知被 sessionExpiredNotified 去重', () => {
    const coordinator = createAuthCoordinator({} as Pinia)
    coordinator.routeAccess.notifySessionExpired()
    coordinator.routeAccess.notifySessionExpired()
    expect(mocks.broadcastAuthEvent).toHaveBeenCalledOnce()
    expect(mocks.broadcastAuthEvent).toHaveBeenCalledWith('session-expired')
  })

  it('classifyFailure 对非 401/403/503 的 BFF 错误落到 unknown 兜底', () => {
    const coordinator = createAuthCoordinator({} as Pinia)
    expect(
      coordinator.routeAccess.classifyFailure(new mocks.MockBffError('server', 500, 1, 't500')),
    ).toEqual({ kind: 'unknown', traceId: 't500' })
  })

  it('classifyFailure 覆盖 403 分类与非 BffError 兜底', () => {
    const coordinator = createAuthCoordinator({} as Pinia)
    expect(
      coordinator.routeAccess.classifyFailure(new mocks.MockBffError('no-perm', 403, 3, 't3')),
    ).toEqual({ kind: 'forbidden', traceId: 't3' })
    expect(coordinator.routeAccess.classifyFailure(new Error('boom'))).toEqual({ kind: 'unknown' })
  })

  it('getSession 未认证时透传原始 session、不注入 identity 包装', async () => {
  mocks.getSession.mockResolvedValue({ authenticated: false, identity: null })
  const coordinator = createAuthCoordinator({} as Pinia)
  expect(await coordinator.routeAccess.getSession()).toEqual({
    authenticated: false,
    identity: null,
  })
})

  it('redirectUnauthenticated 统一跳登录页并保留回跳路径', () => {
    const router = { push: vi.fn<(t: unknown) => unknown>() }
    const coordinator = createAuthCoordinator({} as Pinia)
    coordinator.redirectUnauthenticated(router as unknown as Router, '/x')
    expect(router.push).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: '/x' },
    })
  })
})
