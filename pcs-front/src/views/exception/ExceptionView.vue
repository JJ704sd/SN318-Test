<template>
  <div class="exception-view">
    <component :is="config.icon" class="exception-view__icon" />
    <h1 class="exception-view__title">{{ config.title }}</h1>
    <p class="exception-view__desc">{{ config.desc }}</p>
    <div class="exception-view__actions">
      <a-button type="primary" @click="runAction(config.handler)">
        {{ config.action }}
      </a-button>
      <a-button
        v-if="config.secondaryAction && config.secondaryHandler"
        @click="runAction(config.secondaryHandler)"
      >
        {{ config.secondaryAction }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IconFile,
  IconLock,
  IconExclamationCircle,
  IconWifi,
  IconCloud,
} from '@arco-design/web-vue/es/icon'
import { env } from '@baiyun/template-core/config'

type ExceptionType =
  | '404'
  | '403'
  | '500'
  | 'offline'
  | 'error'
  | 'auth-unavailable'
  | 'auth-error'

type ActionHandler = 'home' | 'reload' | 'relogin'

interface ExceptionConfig {
  icon: unknown
  title: string
  desc: string
  action: string
  handler: ActionHandler
  secondaryAction?: string
  secondaryHandler?: ActionHandler
}

const props = withDefaults(
  defineProps<{
    type?: ExceptionType
  }>(),
  {
    type: undefined,
  },
)

const route = useRoute()
const router = useRouter()

const CONFIG_MAP: Record<ExceptionType, ExceptionConfig> = {
  '404': { icon: IconFile, title: '页面不存在', desc: '抱歉，您访问的页面不存在或已被移除', action: '返回首页', handler: 'home' },
  '403': { icon: IconLock, title: '暂无访问权限', desc: '请联系管理员获取相应权限', action: '返回首页', handler: 'home' },
  '500': { icon: IconExclamationCircle, title: '服务器开小差了', desc: '系统出现异常，请稍后重试', action: '刷新重试', handler: 'reload', secondaryAction: '返回首页', secondaryHandler: 'home' },
  offline: { icon: IconWifi, title: '网络连接失败', desc: '请检查网络连接后重试', action: '重新加载', handler: 'reload' },
  error: { icon: IconExclamationCircle, title: '加载失败', desc: '内容加载失败，请刷新重试', action: '刷新重试', handler: 'reload' },
  'auth-unavailable': { icon: IconCloud, title: '认证服务暂时不可用', desc: '认证服务繁忙或正在维护，请稍后重试', action: '重新加载', handler: 'reload', secondaryAction: '返回首页', secondaryHandler: 'home' },
  'auth-error': { icon: IconExclamationCircle, title: '认证异常', desc: '认证过程出现异常，请重新登录', action: '重新登录', handler: 'relogin', secondaryAction: '返回首页', secondaryHandler: 'home' },
}

// 优先用 prop（作为可复用状态嵌入页面），否则读 route.meta.exceptionType（路由级 404/403）
const resolvedType = computed<ExceptionType>(
  () => props.type ?? (route.meta.exceptionType as ExceptionType) ?? '404',
)

const config = computed(() => CONFIG_MAP[resolvedType.value])

/** 重新登录：mock 模式跳前端 /login，真实模式整页跳 /auth/login。
 *  动态 import 避免与 auth-client 的静态循环依赖。 */
async function relogin(): Promise<void> {
  if (env.useMockAuth) {
    await router.push('/login')
    return
  }
  const { login } = await import('@baiyun/template-core/auth')
  login(`${window.location.pathname}${window.location.search}${window.location.hash}`)
}

async function runAction(handler: ActionHandler) {
  if (handler === 'home') {
    await router.push('/')
  } else if (handler === 'reload') {
    router.go(0)
  } else if (handler === 'relogin') {
    await relogin()
  }
}
</script>

<style scoped>
.exception-view {
  /* Positioning */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  /* Box Model - 整页占满内容区，扣除固定顶栏高度避免额外滚动（ExceptionView 在 BasicLayout 内渲染） */
  min-height: calc(100vh - var(--layout-header-height));
  padding: var(--spacing-2xl) var(--spacing-lg);
}

.exception-view__icon {
  /* Box Model */
  width: var(--exception-icon-size);
  height: var(--exception-icon-size);
  margin-bottom: var(--spacing-lg);

  /* Typographic */
  color: var(--color-text-placeholder);
}

.exception-view__title {
  /* Box Model */
  margin: 0 0 var(--spacing-sm);

  /* Typographic */
  font-size: var(--font-size-exception-title);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.exception-view__desc {
  /* Box Model */
  margin: 0 0 var(--spacing-lg);

  /* Typographic */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
}

.exception-view__actions {
  /* Positioning */
  display: flex;

  /* Box Model */
  gap: var(--spacing-md);
}
</style>
