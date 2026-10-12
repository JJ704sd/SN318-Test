<template>
  <div class="app-header">
    <!-- 左区：折叠/汉堡 + logo + 系统名 -->
    <div class="app-header__left">
      <ByIconButton
        v-if="isDesktop"
        class="app-header__sider-toggle"
        :tooltip="siderStore.siderCollapsed ? '展开菜单' : '收起菜单'"
        :tooltip-props="HOVER_DELAY_PROPS"
        @click="siderStore.toggleSider"
      >
        <icon-menu-unfold v-if="siderStore.siderCollapsed" />
        <icon-menu-fold v-else />
      </ByIconButton>
      <ByIconButton
        v-else
        class="app-header__sider-toggle"
        tooltip="打开菜单"
        :show-tooltip="false"
        @click="siderStore.openSiderDrawer"
      >
        <icon-menu />
      </ByIconButton>

      <div class="app-header__brand">
        <img class="app-header__logo" :src="TYKJ_LOGO" alt="" aria-hidden="true" />
        <span class="app-header__title">百运前台通用模板</span>
      </div>
    </div>

    <!-- 右区：搜索 + 通知 + 用户 -->
    <div class="app-header__right">
      <a-input-search
        v-if="isDesktop || searchExpanded"
        v-model="searchKeyword"
        class="app-header__search"
        placeholder="搜索"
        allow-clear
      />
      <ByIconButton
        v-else-if="isTablet"
        tooltip="搜索"
        :tooltip-props="HOVER_DELAY_PROPS"
        @click="searchExpanded = true"
      >
        <icon-search />
      </ByIconButton>

      <ByIconButton tooltip="通知" :tooltip-props="HOVER_DELAY_PROPS">
        <icon-notification />
      </ByIconButton>

      <a-dropdown v-if="isMobile" trigger="click">
        <ByIconButton tooltip="更多" :tooltip-props="HOVER_DELAY_PROPS">
          <icon-more />
        </ByIconButton>
        <template #content>
          <a-doption @click="searchExpanded = true">
            <template #icon><icon-search /></template>
            搜索
          </a-doption>
        </template>
      </a-dropdown>

      <a-dropdown trigger="click" content-class="app-header__user-menu">
        <div class="app-header__user">
          <a-avatar :size="28" class="app-header__avatar">
            <icon-user />
          </a-avatar>
          <span v-if="!isMobile" class="app-header__username">{{ username }}</span>
          <icon-down v-if="!isMobile" class="app-header__caret" />
        </div>
        <template #content>
          <a-doption @click="onLogout">
            <template #icon><icon-poweroff /></template>
            退出登录
          </a-doption>
          <a-doption @click="onLogoutSso">
            <template #icon><icon-export /></template>
            退出统一登录
          </a-doption>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import TYKJ_LOGO from '@/assets/logo_tykj.svg'
import { useSiderStore, useUserStore } from '@baiyun/template-core/stores'
import { useDevice } from '@baiyun/template-core/composables'
import { ByIconButton } from '@baiyun/template-core/components'
import { env } from '@baiyun/template-core/config'
import { broadcastAuthEvent, login, logout } from '@baiyun/template-core/auth'
import { AUTH_COORDINATOR_KEY } from '@/bootstrap/auth'

const siderStore = useSiderStore()
const userStore = useUserStore()
const router = useRouter()
const { device } = useDevice()

function requireAuthCoordinator() {
  const coordinator = inject(AUTH_COORDINATOR_KEY)
  if (!coordinator) throw new Error('认证协调器未初始化')
  return coordinator
}

const authCoordinator = requireAuthCoordinator()

const isDesktop = computed(() => device.value === 'desktop')
const isTablet = computed(() => device.value === 'tablet')
const isMobile = computed(() => device.value === 'mobile')

const searchKeyword = ref('')
// Tablet 搜索图标点击后展开输入框；Mobile 从「更多」菜单进入
const searchExpanded = ref(false)

// 顶栏图标按钮 tooltip 延迟（规范 §04：100-200ms，防快速划过频繁弹出）
const HOVER_DELAY_PROPS = { mouseEnterDelay: 150, mouseLeaveDelay: 100 }

const username = computed(
  () => userStore.userInfo?.display_name ?? userStore.userInfo?.username ?? '未登录',
)

// 退出当前应用：调 logout('application') -> 清权限态/用户态/CSRF cookie -> 跳统一登录页。
// try/finally 保证 BFF logout 失败时前端态仍清空，避免 UI 残留"已登录"假象。
// 广播 logout 事件通知其他标签页同步清前端态（避免 B 标签页 UI 残留 / 数据错乱）。
// 真实模式跳 login('/', true) 强制重新认证：避免 SSO 仍有效自动登录回原账号。
// mock 模式跳前端 /login 路由（mockLogin 表单）。
async function onLogout() {
  try {
    await logout('application')
  } finally {
    authCoordinator.clearSession()
    broadcastAuthEvent('logout')
  }
  if (env.useMockAuth) {
    await router.push('/login')
  } else {
    login('/', true)
  }
}

// 退出统一登录：真实模式调 logout('sso') -> BFF 返回 sso_redirect -> 整页跳 AuthCenter 全站登出页。
// 成功后本页面上下文随整页跳转销毁，不需要清前端态或强制重认证；AuthCenter 完成登出后回跳应用。
// 失败时保留当前登录态以便重试，错误由全局拦截器提示。
// mock 模式无真实 sso_redirect，与"退出登录"等效（mockLogout 不返回 sso_redirect 会抛错）。
async function onLogoutSso() {
  if (env.useMockAuth) {
    await onLogout()
    return
  }
  try {
    await logout('sso')
  } catch {
    // 失败保留当前登录态；全局错误拦截器会提示
  }
}
</script>

<style scoped>
.app-header {
  /* Positioning */
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.app-header__left {
  /* Positioning */
  display: flex;
  align-items: center;

  /* Box Model */
  gap: var(--spacing-sm);
}

.app-header__brand {
  /* Positioning */
  display: flex;
  align-items: center;

  /* Box Model */
  gap: var(--spacing-xs);
}

.app-header__logo {
  /* Box Model */
  display: block;
  flex: none;
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.app-header__title {
  /* Typographic */
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
  white-space: nowrap;
}

.app-header__right {
  /* Positioning */
  display: flex;
  align-items: center;

  /* Box Model */
  gap: var(--spacing-sm);
}

.app-header__search {
  /* Box Model */
  width: 220px;
}

.app-header__user {
  /* Positioning */
  display: flex;
  align-items: center;

  /* Box Model */
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);

  /* Visual */
  border-radius: var(--border-radius-default);

  /* Misc */
  cursor: pointer;
  transition: background-color var(--duration-state) var(--ease-state);
}

.app-header__user:hover {
  /* Visual */
  background-color: var(--color-bg-surface);
}

.app-header__username {
  /* Typographic */
  font-size: var(--font-size-base);
  color: var(--color-text-body);
  white-space: nowrap;
}

.app-header__caret {
  /* Typographic */
  color: var(--color-text-secondary);
}
</style>

<style>
/* 顶部用户面板与侧边菜单收起态子菜单使用同一套浮层规范。 */
.app-header__user-menu .arco-dropdown {
  box-sizing: border-box;
  min-width: 90px;
  padding: var(--spacing-sm);

  background-color: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--border-radius-default);
  box-shadow: var(--shadow-md);
}

.app-header__user-menu .arco-dropdown-option {
  box-sizing: border-box;
  min-height: 36px;
  padding: var(--spacing-sm) 8px;

  color: var(--color-text-title);
  line-height: var(--line-height-base);
  background-color: transparent;
  border-radius: var(--border-radius-default);
  transition:
    color var(--duration-state) var(--ease-state),
    background-color var(--duration-state) var(--ease-state);
}

.app-header__user-menu .arco-dropdown-option:hover {
  color: var(--color-primary);
  background-color: var(--color-bg-surface);
}
</style>
