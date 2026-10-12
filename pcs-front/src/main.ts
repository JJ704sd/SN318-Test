import '@baiyun/template-core/styles/tokens.css'
import '@baiyun/template-core/styles/reset.css'

// Arco 样式：基础变量 es/style/index.css 提供 CSS 变量默认值；页面模板的 a-*/icon-*
// 组件样式由 vite.config 的 ArcoResolver 在各使用处按需注入；Core 组件自带的 Arco 组件样式
// 由 @baiyun/template-core 各领域入口（components/ai）副作用声明（H-02）。
// 例外：pagination 因 symlink 打包边界下 Core 重导入未落入产物，作为受控例外在此显式引入，
// 保障列表分页样式；其余组件不再维护兜底清单。
// import '@arco-design/web-vue/es/style/index.css'
import '@arco-design/web-vue/es/pagination/style/css.js'
import '@baiyun/template-core/styles/arco-theme.less'
import 'virtual:svg-icons-register'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { routes } from '@/router/routes'
import { registerRouteNavigationLoading } from '@/layout/composables/useRouteNavigationLoading'
import { permissionDirective } from '@/directives/permission'
import { loadConfig, assertEnv, getConfig } from '@baiyun/template-core/config'
import { createAppRouter } from '@baiyun/template-core/router'
import {
  registerAuthMocks,
  refreshCsrfToken,
} from '@baiyun/template-core/auth'
import { configureApiHandlers } from '@baiyun/template-core/api'
import { errorMsg } from '@baiyun/template-core/components'
import { escapeHtml } from '@/utils/html'
import { AUTH_COORDINATOR_KEY, createAuthCoordinator } from '@/bootstrap/auth'

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

// 运行时配置加载：fetch /env.js + /config.js 存内存模块作用域变量（不挂 window，避免 XSS 篡改）。
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
if (configs?.useMockAuth === true) {
  const { mockGetSession, mockGetFrontendProfile, mockLogout } = await import('@/mock/auth')
  registerAuthMocks({ mockGetSession, mockGetFrontendProfile, mockLogout })
}

const router = createAppRouter(routes, authCoordinator.routeAccess)
registerRouteNavigationLoading(router)

// API 响应处理器：核心层 api 层不再内置 UI/跳转响应，由业务在此注入。
// 需在 createAppRouter 之后注册（onUnauthorized mock 分支用 router）、mount 之前完成。
// - onError：请求失败 Toast（等价旧 core dispatchError 默认行为，401/403 也会提示）
// - onUnauthorized：401 会话失效跳登录（mock 跳前端 /login 带回跳；真实模式整页跳 BFF）
// - onCsrfStale：403 CSRF 可能轮换，被动刷新 cookie（不重放当前请求）
configureApiHandlers({
  onError: (error) => {
    errorMsg(error.message)
  },
  onUnauthorized: () => {
    const current = router.currentRoute.value
    if (current.path === '/login') return
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
    authCoordinator.redirectUnauthenticated(router, returnTo)
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
