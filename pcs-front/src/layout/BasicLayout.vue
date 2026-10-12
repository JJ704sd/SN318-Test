<template>
  <a-layout class="basic-layout">
    <a-layout-header class="basic-layout__header">
      <AppHeader />
    </a-layout-header>

    <a-layout class="basic-layout__body">
      <!-- 桌面（≥1280）常驻侧栏：≥1440 展开 220 / 1280–1439 折叠 56，由 siderCollapsed 控制 -->
      <a-layout-sider
        v-if="isDesktop"
        class="basic-layout__sider"
        :collapsed="siderStore.siderCollapsed"
        :width="SIDER_WIDTH"
        :collapsed-width="SIDER_COLLAPSED_WIDTH"
        :collapsible="false"
        :trigger="null"
      >
        <!-- 首次刷新初始化时，侧栏与内容区一起使用骨架；后续切页保留可用导航。 -->
        <AppSiderSkeleton
          v-if="isInitialRouteNavigationLoading"
          :collapsed="siderStore.siderCollapsed"
        />
        <AppSider v-else />
      </a-layout-sider>

      <a-layout-content
        class="basic-layout__content"
        :class="{
          'is-sider-expanded': isDesktop && !siderStore.siderCollapsed,
          'is-sider-collapsed': isDesktop && siderStore.siderCollapsed,
        }"
      >
        <a-skeleton
          v-if="isRouteNavigationLoading"
          class="basic-layout__content-skeleton"
          :animation="true"
          role="status"
          aria-label="页面加载中"
          aria-busy="true"
        >
          <div class="basic-layout__content-skeleton-header">
            <a-skeleton-line :rows="1" :widths="['40%']" :line-height="28" />
            <a-skeleton-line :rows="1" :widths="['20%']" :line-height="28" />
          </div>
          <div class="basic-layout__content-skeleton-cards">
            <a-skeleton-line
              :rows="2"
              :widths="['100%', '72%']"
              :line-height="72"
              :line-spacing="16"
            />
          </div>
          <a-skeleton-line
            :rows="6"
            :widths="['100%', '92%', '84%', '96%', '74%', '88%']"
            :line-height="20"
            :line-spacing="16"
          />
        </a-skeleton>

        <router-view v-else v-slot="{ Component: RouteComponent }">
          <transition name="fade" mode="out-in">
            <component :is="RouteComponent" />
          </transition>
        </router-view>
      </a-layout-content>
    </a-layout>

    <!-- <1280（Tablet/Mobile）：侧栏改为左侧 280 抽屉，汉堡按钮触发，点蒙层/选中项关闭，平时不占空间；
         裸内容态（bare）：与常驻侧栏视觉一致，无头部、body 零内边距 -->
    <ByDrawer
      v-if="!isDesktop"
      :visible="siderStore.siderDrawerVisible"
      :width="SIDER_DRAWER_WIDTH"
      placement="left"
      bare
      @update:visible="onDrawerVisible"
      @close="siderStore.closeSiderDrawer"
    >
      <AppSiderSkeleton v-if="isInitialRouteNavigationLoading" />
      <AppSider v-else />
    </ByDrawer>

    <!-- 运小星悬浮入口 + 对话浮层：按 AI 总开关 & 助手子开关动态挂载（S4-G），
         任一开关关闭时不加载任何 AI 代码/图片（经 @baiyun/template-core/ai/assistant 按需） -->
    <component :is="assistant?.trigger" v-if="assistant" :unread-count="1" />
    <component :is="assistant?.panel" v-if="assistant" />
  </a-layout>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, type Component } from 'vue'
import { useSiderStore } from '@baiyun/template-core/stores'
import { env } from '@baiyun/template-core/config'
import { useDevice } from '@baiyun/template-core/composables'
import { ByDrawer } from '@baiyun/template-core/components'
import { ensureAiReady, type AiReadyResult } from '@/bootstrap/aiReady'
import AppHeader from './components/AppHeader.vue'
import AppSider from './components/AppSider.vue'
import AppSiderSkeleton from './components/AppSiderSkeleton.vue'
import {
  isInitialRouteNavigationLoading,
  isRouteNavigationLoading,
} from './composables/useRouteNavigationLoading'

const SIDER_WIDTH = 220 /* 与 --layout-sider-width 同步 */
const SIDER_COLLAPSED_WIDTH = 56 /* 与 --layout-sider-collapsed-width 同步 */
const SIDER_DRAWER_WIDTH = 280

const siderStore = useSiderStore()
// 根布局挂载 useDevice 驱动全局断点探测
const { isDesktop, desktopExpanded } = useDevice()

// AI 服务唯一初始化（H-01）：ensureAiReady 按配置选择并注册明确适配器（prod 不实例化 Mock），
// 缓存结果供所有 AI 交互 await，杜绝注册与首次请求之间的竞态。
// assistant 仅在 AI 已 ready（而非 pending/disabled/error）且助手子开关开启时挂载，
// 任一开关关闭时不产生任何 /ai 加载与背景图请求。
const aiReadyState = ref<AiReadyResult | null>(null)
void ensureAiReady().then((result) => {
  aiReadyState.value = result
})

const assistant = computed<{ trigger: Component; panel: Component } | null>(() => {
  if (aiReadyState.value?.status !== 'ready') return null
  if (!env.aiAssistantEnabled) return null
  return {
    trigger: defineAsyncComponent(() =>
      import('@baiyun/template-core/ai/assistant').then((m) => m.AiAssistantTrigger),
    ),
    panel: defineAsyncComponent(() =>
      import('@baiyun/template-core/ai/assistant').then((m) => m.AiAssistantPanel),
    ),
  }
})

// 桌面三态：≥1440 展开 / 1280–1439 折叠 / <1280 抽屉
const desktopMode = computed<'expanded' | 'collapsed' | 'drawer'>(() => {
  if (!isDesktop.value) return 'drawer'
  return desktopExpanded.value ? 'expanded' : 'collapsed'
})

// 仅跨子档时重置折叠态，同档内不覆盖用户手动 toggle；抽屉档不动 siderCollapsed
watch(
  desktopMode,
  (mode) => {
    if (mode === 'expanded') siderStore.setSiderCollapsed(false)
    else if (mode === 'collapsed') siderStore.setSiderCollapsed(true)
  },
  { immediate: true },
)

function onDrawerVisible(visible: boolean) {
  if (!visible) siderStore.closeSiderDrawer()
}
</script>

<style scoped>
.basic-layout {
  /* Box Model */
  min-height: 100vh;

  /* Visual */
  background-color: var(--color-bg-page);
}

.basic-layout__header {
  /* Positioning */
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: var(--z-header);
  display: flex;
  align-items: center;

  /* Box Model */
  height: var(--layout-header-height);

  /* Desktop：折叠按钮内图标与侧栏菜单图标左缘对齐
   * 菜单图标左缘 = inner(16) + item(12) = 28
   * 按钮内图标相对 32 盒再偏 (32-16)/2 = 8
   * 故顶栏 pl = 28 - 8 = 20 */
  padding: 0 var(--spacing-lg);
  padding-left: calc(
    var(--layout-sider-menu-inner-padding-x) + var(--layout-sider-menu-padding-x) -
      (var(--size-icon-btn) - var(--icon-size-inline)) / 2
  );

  /* Visual */
  background-color: var(--color-bg-card);
  border-bottom: 1px solid var(--color-divider);
}

@media (width <= 1279px) {
  .basic-layout__header {
    /* Tablet/Mobile 无常驻侧栏，左右对称用 spacing-lg */
    padding-left: var(--spacing-lg);
  }
}

.basic-layout__body {
  /* Box Model - 避让固定顶栏：内容整体下移一个顶栏高度 */
  padding-top: var(--layout-header-height);
}

.basic-layout__sider {
  /* Positioning */
  position: fixed;
  top: var(--layout-header-height);
  left: 0;
  bottom: 0;
  z-index: var(--z-sidebar);

  /* Visual */
  background-color: var(--color-bg-card);
  border-right: 1px solid var(--color-divider);
  box-shadow: none;
  overflow: hidden;
}

.basic-layout__content {
  /* 仅左边距（让出固定侧栏 + 间距）；上/右/下内边距由各页面根节点（如 .list-view）承接，
   * 使 PageHeader 白底可通栏至内容区右缘 */
  padding-left: var(--layout-content-padding);
}

.basic-layout__content-skeleton {
  box-sizing: border-box;
  min-height: calc(100vh - var(--layout-header-height));
  margin-left: calc(var(--layout-content-padding) * -1);
  padding: var(--layout-content-padding);
  background-color: var(--color-bg-card);
}

.basic-layout__content-skeleton-header {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.basic-layout__content-skeleton-cards {
  margin-bottom: var(--spacing-lg);
}

.basic-layout__content.is-sider-expanded {
  /* 固定侧栏展开时让出空间 + 24px 间距，避免内容紧贴侧栏 */
  padding-left: calc(var(--layout-sider-width) + var(--spacing-lg));
}

.basic-layout__content.is-sider-collapsed {
  /* 固定侧栏折叠时让出空间 + 24px 间距；<1280 抽屉态不挂该 class，padding 走默认 */
  padding-left: calc(var(--layout-sider-collapsed-width) + var(--spacing-lg));
}

/* 页面过渡（规范 §07：300ms ease-in-out，仅淡入淡出、不做位移/尺寸变化） */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-page) var(--ease-page);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
