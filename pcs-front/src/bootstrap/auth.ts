import type { Pinia } from 'pinia'
import type { InjectionKey } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'
import {
  BffError,
  broadcastAuthEvent,
  clearCsrfToken,
  getFrontendProfile,
  getSession,
  setCsrfToken,
  subscribeAuthEvents,
} from '@core/auth'
import type { RouteAccessDependencies } from '@core/router'
import { usePermissionStore, useUserStore } from '@core/stores'

type AuthenticatedRouteSession = Parameters<RouteAccessDependencies['syncSession']>[0]

function toPermissionSnapshot(profile: Awaited<ReturnType<typeof getFrontendProfile>>) {
  return {
    subject: profile.subject,
    systemCode: profile.system_code,
    environment: profile.environment,
    permissionVersion: profile.permission_version,
    resourceIds: profile.resource_ids,
    ttlSeconds: profile.ttl_seconds,
  }
}

export function createAuthCoordinator(pinia: Pinia) {
  const userStore = useUserStore(pinia)
  const permissionStore = usePermissionStore(pinia)
  let unauthenticatedHandlingStarted = false
  let sessionClearCompleted = false
  let sessionExpiredNotified = false
  let permissionExpiresAt = 0
  let permissionInflight: Promise<void> | null = null
  let permissionGeneration = 0

  function clearSession(): void {
    if (sessionClearCompleted) return
    sessionClearCompleted = true
    userStore.logout()
    permissionStore.clear()
    clearCsrfToken()
    permissionExpiresAt = 0
    permissionInflight = null
    permissionGeneration += 1
  }

  async function ensurePermissions(force = false): Promise<void> {
    if (permissionInflight) return permissionInflight
    if (permissionStore.loaded && !force && Date.now() < permissionExpiresAt) return

    permissionStore.setLoading(true)
    const generation = permissionGeneration
    const request = (async () => {
      const profile = await getFrontendProfile(force)
      if (generation !== permissionGeneration) return
      permissionStore.applyProfile(toPermissionSnapshot(profile))
      permissionExpiresAt = Date.now() + profile.ttl_seconds * 1000
    })()
    permissionInflight = request

    try {
      await request
    } catch (error) {
      if (generation === permissionGeneration) permissionStore.setError(error)
      throw error
    } finally {
      if (generation === permissionGeneration) permissionStore.setLoading(false)
      if (permissionInflight === request) permissionInflight = null
    }
  }

  function handleUnauthenticated(returnTo: string): RouteLocationRaw | false {
    if (unauthenticatedHandlingStarted) return false
    unauthenticatedHandlingStarted = true
    return { path: '/login', query: { redirect: returnTo } }
  }

  const routeAccess: RouteAccessDependencies = {
    async getSession() {
      const session = await getSession()
      if (!session.authenticated) return session
      return {
        authenticated: true,
        identity: session.identity,
        csrfToken: session.csrf_token,
      }
    },
    hasLocalSession: () => userStore.isLoggedIn,
    syncSession(session: AuthenticatedRouteSession) {
      userStore.setUserInfo(session.identity)
      setCsrfToken(session.csrfToken)
      unauthenticatedHandlingStarted = false
      sessionClearCompleted = false
      sessionExpiredNotified = false
    },
    clearSession,
    ensurePermissions,
    canAccess: (resourceId) => permissionStore.can(resourceId),
    handleUnauthenticated,
    notifySessionExpired() {
      if (sessionExpiredNotified) return
      sessionExpiredNotified = true
      broadcastAuthEvent('session-expired')
    },
    classifyFailure(error) {
      if (!(error instanceof BffError)) return { kind: 'unknown' }
      if (error.status === 401) return { kind: 'unauthorized', traceId: error.traceId }
      if (error.status === 403) return { kind: 'forbidden', traceId: error.traceId }
      if (error.status === 503) return { kind: 'unavailable', traceId: error.traceId }
      return { kind: 'unknown', traceId: error.traceId }
    },
  }

  function redirectUnauthenticated(router: Router, returnTo: string): void {
    if (unauthenticatedHandlingStarted) return
    clearSession()
    const target = handleUnauthenticated(returnTo)
    if (target) void router.push(target)
  }

  function listenAuthEvents(router: Router): () => void {
    return subscribeAuthEvents((event) => {
      if (event.type !== 'logout' && event.type !== 'session-expired') return
      const wasAlreadyCleared = sessionClearCompleted
      clearSession()
      if (!wasAlreadyCleared && router.currentRoute.value.path !== '/login') {
        void router.push('/login')
      }
    })
  }

  return {
    routeAccess,
    clearSession,
    redirectUnauthenticated,
    listenAuthEvents,
  }
}

export type AuthCoordinator = ReturnType<typeof createAuthCoordinator>

/**
 * 认证协调器由应用组合根创建并注入，组件只依赖显式契约，
 * 避免通过模块全局变量或 Core 反向访问 Router/Store。
 */
export const AUTH_COORDINATOR_KEY: InjectionKey<AuthCoordinator> = Symbol('authCoordinator')
