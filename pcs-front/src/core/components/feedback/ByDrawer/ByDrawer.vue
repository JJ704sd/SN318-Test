<template>
  <a-drawer
    :visible="visible"
    :width="resolvedWidth"
    :placement="placement"
    :mask-closable="maskClosable"
    :esc-to-close="true"
    :closable="false"
    :header="!bare"
    :footer="hasFooter"
    unmount-on-close
    class="by-drawer"
    :class="{
      'by-drawer--fullscreen': fullscreen,
      'by-drawer--bare': bare,
      [`by-drawer--${size}`]: true,
    }"
    @update:visible="handleUpdateVisible"
    @cancel="handleClose"
  >
    <template v-if="!bare" #title>
      <div class="by-drawer__header">
        <span class="by-drawer__title">{{ title }}</span>
        <button
          class="by-drawer__close"
          type="button"
          aria-label="关闭"
          @click="handleClose"
        >
          <IconClose :size="16" />
        </button>
      </div>
    </template>

    <div class="by-drawer__body">
      <template v-if="loading">
        <a-skeleton :animation="true">
          <a-skeleton-line :rows="6" :line-spacing="16" />
        </a-skeleton>
      </template>
      <template v-else>
        <slot />
      </template>
    </div>

    <template v-if="hasFooter" #footer>
      <div class="by-drawer__footer">
        <slot name="footer" />
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { IconClose } from '@arco-design/web-vue/es/icon/index.js'
import { useDevice } from '@core/composables/useDevice'

export type DrawerSize = 'default' | 'large'

interface Props {
  visible: boolean
  title?: string
  /** 抽屉宽度：default=480 / large=640（非 Mobile）*/
  size?: DrawerSize
  placement?: 'left' | 'right'
  maskClosable?: boolean
  /** 加载中：内容区骨架屏，标题与关闭仍可用 */
  loading?: boolean
  // 显式宽度（如侧栏抽屉固定 280）：传入时覆盖 size 映射，且不套用 mobile 全屏
  width?: number | string
  /** 裸内容态：不渲染头部，body 零内边距（如 <1280 侧栏菜单抽屉） */
  bare?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'default',
  placement: 'right',
  maskClosable: true,
  loading: false,
  bare: false,
})

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'close'): void
}>()

const slots = useSlots()
const { device } = useDevice()

const SIZE_WIDTH: Record<DrawerSize, number> = {
  default: 480,
  large: 640,
}

const hasFooter = computed(() => Boolean(slots.footer) && !props.loading)

const resolvedWidth = computed(() => {
  if (props.width != null) return props.width
  if (device.value === 'mobile') return '100%'
  return SIZE_WIDTH[props.size]
})

// 仅默认宽度下 mobile 才全屏；显式 width（侧栏抽屉 280）保持固定宽度
const fullscreen = computed(() => device.value === 'mobile' && props.width == null)

function handleClose() {
  emit('close')
  emit('update:visible', false)
}

function handleUpdateVisible(v: boolean) {
  emit('update:visible', v)
}
import { Drawer as ADrawer, Skeleton as ASkeleton, SkeletonLine as ASkeletonLine } from '@arco-design/web-vue'
</script>

<style scoped>
/*
 * ByDrawer（规范 §05 Drawer / drawer-components.html）：
 * 右侧贴边、高度 100vh；默认 480 / 宽 640；圆角 0；
 * 头 56 / 内容可滚 / 底 64 固定；遮罩 rgba(0,0,0,0.45)；阴影 shadow-drawer。
 *
 * 注意：class 透传落在 Arco 的 .arco-drawer-container 上，而它经 ClientOnly→Teleport
 * 渲染，scoped data-v 属性到不了该节点——凡作用于 container 及 Arco 内部结构的规则
 * 必须写 :global()（含 .by-drawer 自身），否则 [data-v] 匹配失败整条失效。
 * 仅 __header / __title 等本组件模板渲染的 slot 内容可用普通 scoped 选择器。
 */

/* container 自身：抽屉层级 */
:global(.by-drawer) {
  z-index: var(--z-drawer);
}

:global(.by-drawer .arco-drawer) {
  box-shadow: var(--shadow-lg);
}

:global(.by-drawer .arco-drawer-header) {
  padding: var(--spacing-lg);
}

/* 裸内容态（如 <1280 侧栏菜单抽屉）：兜底隐藏 Arco 头部，
 * 双保险——即使外部误传 header/title，.arco-drawer-header 也不显示 */
:global(.by-drawer--bare .arco-drawer-header) {
  display: none;
}

:global(.by-drawer .arco-drawer-body) {
  padding: 0;
  scrollbar-color: var(--color-text-secondary) transparent;
  scrollbar-width: thin;
}

:global(.by-drawer .arco-drawer-body::-webkit-scrollbar) {
  width: var(--spacing-xs);
  height: var(--spacing-xs);
}

:global(.by-drawer .arco-drawer-body::-webkit-scrollbar-button) {
  display: none;
}

:global(.by-drawer .arco-drawer-body::-webkit-scrollbar-track) {
  background-color: transparent;
}

:global(.by-drawer .arco-drawer-body::-webkit-scrollbar-thumb) {
  background-color: var(--color-text-secondary);
  border-radius: var(--border-radius-default);
}

:global(.by-drawer .arco-drawer-body::-webkit-scrollbar-thumb:hover) {
  background-color: var(--color-text-body);
}

/* enter-from / leave-to 类加在 container（.by-drawer 元素）自身上，用交集而非后代 */
:global(.by-drawer.arco-drawer-container-enter-from .arco-drawer),
:global(.by-drawer.arco-drawer-container-leave-to .arco-drawer) {
  transition: transform var(--duration-drawer-in) var(--ease-drawer-in);
}

.by-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-width: 0;
}

.by-drawer__title {
  overflow: hidden;
  color: var(--color-text-title);
  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-h2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.by-drawer__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;

  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-default);

  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
}

.by-drawer__close:hover {
  color: var(--color-text-title);
  background: var(--color-bg-surface);
}

.by-drawer__body {
  box-sizing: border-box;
  min-height: 0;
  height: 100%;
}

.by-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  width: 100%;
}

.by-drawer__footer :deep(.arco-btn) {
  min-width: 80px;
}
</style>
