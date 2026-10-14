import '@core/styles/tokens.css'
import '@core/styles/reset.css'

// Arco 样式：基础变量 es/style/index.css 提供 CSS 变量默认值；页面模板的 a-*/icon-*
// 组件样式由 vite.config 的 ArcoResolver 在各使用处按需注入；核心层组件自带的 Arco 组件样式
// 由 @core 各领域入口（components/ai）副作用声明（含 pagination，已验证随构建产物落入）。
// import '@arco-design/web-vue/es/style/index.css'
import '@core/styles/arco-theme.less'
import '@/styles/app.css'
import 'virtual:svg-icons-register'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { routes } from '@/router/routes'
import { registerRouteNavigationLoading } from '@/layout/composables/useRouteNavigationLoading'
import { permissionDirective } from '@/directives/permission'
import { loadConfig, assertEnv, getConfig } from '@core/config'
import { createAppRouter } from '@core/router'
import {
  registerAuthMocks,
  refreshCsrfToken,
} from '@core/auth'
import { configureApiHandlers, getHttp } from '@core/api'
import { errorMsg } from '@core/components'
import { escapeHtml } from '@/utils/html'
import { AUTH_COORDINATOR_KEY, createAuthCoordinator } from '@/bootstrap/auth'
import { usePermissionStore } from '@core/stores'
import { getMasterDataConfig, getMasterDataGroup, MASTER_DATA_GROUPS } from '@/views/master-data/config'

/** 启动期配置失败 → 阻止挂载并渲染可见错误页，禁止静默回落到 Mock/默认值（fail-closed）。 */
function failStartup(reason: string): never {
  console.error(`[bootstrap] 启动失败：${reason}`)
  const root = document.getElementById('app')
  if (root) {
    root.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:32px;color:var(--color-text-title)">
  <h3 style="margin:0 0 8px">应用配置加载失败</h3>
  <p style="margin:0;color:var(--color-text-secondary)">${escapeHtml(reason)}。请检查 /env.js 环境标识与 /config.js 对应环境配置后刷新。</p>
</div>`
  }
  throw new Error(`[bootstrap] 配置加载失败：${reason}`)
}

// 运行时配置加载：fetch {base}/env.js + {base}/config.js 存内存模块作用域变量（不挂 window，避免 XSS 篡改）。
// 核心层 runtime.ts 已按 Vite base 拼接请求路径，子路径部署（VITE_BASE=/pcs/）无需额外处理。
// 必须在 createApp 之前完成，因为路由守卫与 env.ts 在 mount 前即读取配置。
// 安全失败：关键配置拉取失败即阻止启动，不得回落默认值（默认 useMockAuth=true）进入 Mock 登录。
await loadConfig()
if (!getConfig()) {
  failStartup('/env.js 或 /config.js 拉取失败或 JSON 非法')
}

assertEnv()

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

const authCoordinator = createAuthCoordinator(pinia)
app.provide(AUTH_COORDINATOR_KEY, authCoordinator)

// mock 模式 auth 请求注册：仅在当前环境配置显式声明 useMockAuth === true 时动态加载
// src/mock/auth 并注册（BFF 未就绪时用）。默认与任何异常路径都不加载认证 Mock，
// 避免配置意外把真实 BFF 回落成 Mock（fail-safe）。需在 createPinia 之后、mount 之前。
const configs = getConfig()
if (import.meta.env.DEV && configs?.useMockData === true) {
  const { installLmdMock } = await import('@/mock/lmd')
  const restoreMock = installLmdMock(getHttp(), { development: import.meta.env.DEV, enabled: true })
  if (import.meta.hot) import.meta.hot.dispose(restoreMock)
}
if (configs?.useMockAuth === true) {
  const { mockGetSession, mockGetFrontendProfile, mockLogout, mockLogin } = await import('@/mock/auth')
  registerAuthMocks({ mockGetSession, mockGetFrontendProfile, mockLogout, mockLogin })
}

// router base 显式传入与 Vite base（部署子路径）保持一致：核心层 router 工厂不隐式读取 BASE_URL，
// 运行时传入可保证子路径部署下登录回跳/具名路由不丢失前缀（如 /pcs/）。
const router = createAppRouter(routes, authCoordinator.routeAccess, {
  base: import.meta.env.BASE_URL,
})
router.beforeEach(async (to) => {
  if (to.name === 'master-data-workspace') {
    await authCoordinator.routeAccess.ensurePermissions()
    const permissionStore = usePermissionStore(pinia)
    const requestedResource = typeof to.query.resource === 'string' ? to.query.resource : undefined
    const resource = requestedResource ? getMasterDataConfig(requestedResource) : undefined
    if (requestedResource && !resource) return '/404'
    if (resource) {
      const group = getMasterDataGroup(resource.key)
      const readPermission = `operation:pcs.front.${resource.key}.read`
      if (!permissionStore.can(readPermission)) return '/403'
      if (to.query.group !== group?.key) {
        return { name: 'master-data-workspace', query: { group: group?.key, resource: resource.key }, replace: true }
      }
      return true
    }

    const firstAvailable = MASTER_DATA_GROUPS
      .flatMap((group) => group.resources)
      .find((key) => permissionStore.can(`operation:pcs.front.${key}.read`))
    if (!firstAvailable) return '/403'
    const group = getMasterDataGroup(firstAvailable)
    return { name: 'master-data-workspace', query: { group: group?.key, resource: firstAvailable }, replace: true }
  }

  const readPermission = to.meta.masterDataReadPermission
  if (typeof readPermission !== 'string') return true
  await authCoordinator.routeAccess.ensurePermissions()
  return authCoordinator.routeAccess.canAccess(readPermission) ? true : '/403'
})
registerRouteNavigationLoading(router)

// API 响应处理器：核心层 api 层不再内置 UI/跳转响应，由业务在此注入。
// 需在 createAppRouter 之后注册（onUnauthorized mock 分支用 router）、mount 之前完成。
// - onError：请求失败 Toast（等价旧 core dispatchError 默认行为，401/403 也会提示）
// - onUnauthorized：401 会话失效统一跳 /login，由登录页打开权限中台浮层并带回跳地址
// - onCsrfStale：403 CSRF 可能轮换，被动刷新 cookie（不重放当前请求）
// 回跳地址须为 router base 相对路径：window.location.pathname 含部署子路径（如 /pcs），
// 直接回填会让 router.replace 拼出双重前缀，需先剥离 base。
function resolveReturnTo(): string {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL
  const { pathname, search, hash } = window.location
  const relativePath =
    basePath !== '' && pathname.startsWith(`${basePath}/`) ? pathname.slice(basePath.length) : pathname
  return `${relativePath}${search}${hash}`
}
configureApiHandlers({
  onError: (error) => {
    errorMsg(error.message)
  },
  onUnauthorized: () => {
    // mock 模式下业务数据请求没有 mock 数据源，BFF 401 属预期：不弹回登录页，由页内错误提示兜底
    if (configs?.useMockAuth === true) return
    const current = router.currentRoute.value
    if (current.path === '/login') return
    authCoordinator.redirectUnauthenticated(router, resolveReturnTo())
  },
  onCsrfStale: () => {
    void refreshCsrfToken()
  },
})

// 跨标签页认证事件监听：必须在 Pinia 初始化后注册（协调器依赖当前应用的 store）。
// 收到其他标签页的 logout / session-expired 事件时，清本标签页前端态 + 跳 /login。
// /login 是 public 策略，路由守卫直接放行不调 getSession，不会触发广播，避免循环。
const stopAuthEvents = authCoordinator.listenAuthEvents(router)

if (import.meta.hot) import.meta.hot.dispose(stopAuthEvents)

app.use(router)
app.directive('permission', permissionDirective)

app.mount('#app')
