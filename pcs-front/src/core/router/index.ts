import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type Router,
} from 'vue-router'

/** 路由访问策略（PermissionAccessManual2 v2 四策略）。 */
export type AuthPolicy =
  | 'public'
  | 'optional'
  | 'authenticated'
  | { resourceId: string }

export interface RouteIdentitySnapshot {
  subject: string
  display_name?: string
  username?: string
  authenticated_at?: string
}

export type RouteSessionSnapshot =
  | { authenticated: false }
  | {
      authenticated: true
      identity: RouteIdentitySnapshot
      csrfToken: string
    }

export type RouteAuthFailureKind =
  | 'unauthorized'
  | 'forbidden'
  | 'unavailable'
  | 'unknown'

/**
 * 路由守卫所需的最小能力端口。
 * router 只执行访问策略，不导入 auth client、Pinia Store 或运行时配置实现。
 */
export interface RouteAccessDependencies {
  getSession(): Promise<RouteSessionSnapshot>
  hasLocalSession(): boolean
  syncSession(session: Extract<RouteSessionSnapshot, { authenticated: true }>): void
  clearSession(): void
  ensurePermissions(): Promise<void>
  canAccess(resourceId: string): boolean
  handleUnauthenticated(returnTo: string): RouteLocationRaw | false
  notifySessionExpired(): void
  classifyFailure(error: unknown): {
    kind: RouteAuthFailureKind
    traceId?: string
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    hideInMenu?: boolean
    activeMenu?: string
    exceptionType?: '404' | '403' | '500' | 'offline' | 'error' | 'auth-unavailable' | 'auth-error'
    /** 访问策略；缺省按 'authenticated' 处理 */
    auth?: AuthPolicy
  }
}

/** 业务项目创建的路由实例注册表。 */
let appRouter: Router | null = null

export function getAppRouter(): Router | null {
  return appRouter
}

function resolvePolicy(to: RouteLocationNormalized): AuthPolicy {
  return to.meta.auth ?? 'authenticated'
}

function isResourcePolicy(policy: AuthPolicy): policy is { resourceId: string } {
  return typeof policy === 'object' && 'resourceId' in policy
}

function resolveFailureRoute(
  failure: ReturnType<RouteAccessDependencies['classifyFailure']>,
): RouteLocationRaw {
  if (failure.kind === 'forbidden') return '/403'
  if (failure.kind === 'unavailable') return '/auth-unavailable'
  return {
    path: '/auth-error',
    query: failure.traceId ? { trace_id: failure.traceId } : {},
  }
}

/**
 * createAppRouter 选项。
 *
 * `base` 必须由业务在运行时传入（通常是 `import.meta.env.BASE_URL`）：
 * 本包为 Vite lib 预构建产物，包内的 `import.meta.env.BASE_URL` 在发包构建时
 * 已被静态内联为 `/`，无法反映业务应用的子路径部署（如 `/pcs/`）。
 */
export interface CreateAppRouterOptions {
  /** History base，须与业务 Vite `base` 一致；缺省 `/`。 */
  base?: string
}

/**
 * 创建应用路由实例。认证、状态和跳转副作用全部由业务组合层显式注入。
 */
export function createAppRouter(
  routes: RouteRecordRaw[],
  dependencies: RouteAccessDependencies,
  options: CreateAppRouterOptions = {},
): Router {
  const router = createRouter({
    history: createWebHistory(options.base ?? '/'),
    routes,
  })

  appRouter = router

  router.beforeEach(async (to) => {
    const policy = resolvePolicy(to)
    if (policy === 'public') return true

    try {
      const session = await dependencies.getSession()

      if (session.authenticated) {
        dependencies.syncSession(session)
      } else {
        if (dependencies.hasLocalSession()) dependencies.notifySessionExpired()
        dependencies.clearSession()
      }

      if (policy === 'optional') return true

      if (!session.authenticated) {
        return dependencies.handleUnauthenticated(to.fullPath)
      }

      if (isResourcePolicy(policy)) {
        await dependencies.ensurePermissions()
        if (!dependencies.canAccess(policy.resourceId)) return '/403'
      }

      return true
    } catch (error) {
      if (policy === 'optional') return true

      dependencies.clearSession()
      const failure = dependencies.classifyFailure(error)

      if (failure.kind === 'unauthorized') {
        dependencies.notifySessionExpired()
        return dependencies.handleUnauthenticated(to.fullPath)
      }

      return resolveFailureRoute(failure)
    }
  })

  return router
}
