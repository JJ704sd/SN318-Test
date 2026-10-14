import { computed, ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import {
  CrossSiteSessionUnavailableError,
  ModalLoginError,
} from '@baiyun/auth-center-browser'
import { getSession, loginWithMockUser, setCsrfToken, useMockAuth } from '@core/auth'
import { useUserStore } from '@core/stores'
import { getAuthCenterClient } from '@/auth/auth-center'

const DEFAULT_REDIRECT: RouteLocationRaw = {
  name: 'master-data-workspace',
  query: { group: 'location', resource: 'country' },
}

function isLoginRoute(value: string): boolean {
  return ['/login', '/user/login', '/pcs', '/'].some(
    (path) => value === path || value.startsWith(`${path}?`),
  )
}

function resolveErrorMessage(error: unknown): string {
  if (error instanceof CrossSiteSessionUnavailableError) {
    return '登录服务不可用，请检查网络后重试'
  }
  if (error instanceof ModalLoginError) {
    if (error.code === 'modal_closed') return '登录浮层已关闭'
    if (error.code === 'modal_timeout') return '登录超时，请重试'
    if (error.code === 'modal_unavailable') return '登录浮层不可用，请稍后重试'
    return '登录失败，请稍后重试'
  }
  return '登录失败，请稍后重试'
}

export function useAuthCenterLogin() {
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const loading = ref(false)
  const activeMode = ref<'auto' | 'manual' | null>(null)
  const errorMessage = ref('')

  const canOpenLogin = computed(() => !loading.value)

  function resolveRedirect(): RouteLocationRaw {
    const redirect = route.query.redirect
    if (
      typeof redirect === 'string' &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//') &&
      !isLoginRoute(redirect)
    ) {
      return redirect
    }
    return DEFAULT_REDIRECT
  }

  async function syncSession(): Promise<boolean> {
    const currentSession = await getSession(true)
    if (!currentSession.authenticated) return false

    userStore.setUserInfo(currentSession.identity)
    setCsrfToken(currentSession.csrf_token)
    await router.replace(resolveRedirect())
    return true
  }

  async function tryRestoreSession(): Promise<boolean> {
    try {
      return await syncSession()
    } catch {
      return false
    }
  }

  async function openLogin(forceLogin: boolean): Promise<void> {
    if (!canOpenLogin.value) return

    loading.value = true
    activeMode.value = forceLogin ? 'manual' : 'auto'
    errorMessage.value = ''
    try {
      if (!forceLogin && (await tryRestoreSession())) return

      // mock 模式：跳过认证中台浮层，以演示身份直接建立 mock 会话
      if (useMockAuth()) {
        await loginWithMockUser()
        if (!(await syncSession())) throw new Error('登录会话未建立')
        return
      }

      const session = await getAuthCenterClient().loginModal({
        forceLogin,
        fallbackToPopup: false,
      })
      if (!session.authenticated) throw new Error('登录未完成')

      if (!(await syncSession())) throw new Error('登录会话未建立')
    } catch (error: unknown) {
      errorMessage.value = resolveErrorMessage(error)
    } finally {
      loading.value = false
      activeMode.value = null
    }
  }

  function handleAutoLogin(): void {
    void openLogin(false)
  }

  function handleManualLogin(): void {
    void openLogin(true)
  }

  return { loading, activeMode, errorMessage, canOpenLogin, handleAutoLogin, handleManualLogin }
}
