<template>
  <a-tooltip :content="tooltip" :disabled="disabled || !showTooltip" v-bind="tooltipProps">
    <a-button
      class="by-icon-btn"
      :class="[`by-icon-btn--${size}`, `by-icon-btn--${type}`, { 'by-icon-btn--danger': status === 'danger' }]"
      :disabled="disabled"
      :aria-label="tooltip"
      @click="(e: MouseEvent) => emit('click', e)"
    >
      <template #icon><slot /></template>
    </a-button>
  </a-tooltip>
</template>

<script setup lang="ts">
export type IconBtnSize = 'default' | 'large' | 'small'
export type IconBtnType = 'default' | 'primary'
export type IconBtnStatus = 'default' | 'danger'

/** a-tooltip props 子集（透传弹出延迟等，规范 §04：100-200ms）*/
interface TooltipPropsPassthrough {
  mouseEnterDelay?: number
  mouseLeaveDelay?: number
  position?: 'top' | 'tl' | 'tr' | 'bottom' | 'bl' | 'br' | 'left' | 'lt' | 'lb' | 'right' | 'rt' | 'rb'
  mini?: boolean
}

interface Props {
  tooltip: string
  size?: IconBtnSize
  type?: IconBtnType
  status?: IconBtnStatus
  disabled?: boolean
  /** 是否显示可视 Tooltip；关闭后仍用 tooltip 文案作为按钮 aria-label。 */
  showTooltip?: boolean
  /** 透传 a-tooltip props（如 mouseEnterDelay/mouseLeaveDelay 控制弹出延迟）*/
  tooltipProps?: TooltipPropsPassthrough
}

withDefaults(defineProps<Props>(), {
  size: 'default',
  type: 'default',
  status: 'default',
  disabled: false,
  showTooltip: true,
  tooltipProps: () => ({}),
})

const emit = defineEmits<{ click: [e: MouseEvent] }>()
import { Button as AButton, Tooltip as ATooltip } from '@arco-design/web-vue'
</script>

<style scoped>
/* 基底：32×32 方形 / 圆角 8 / 透明底 / 图标 16px 正文色 */
.by-icon-btn.arco-btn {
  /* Positioning */
  position: relative;

  /* Box Model */
  width: var(--size-icon-btn);
  height: var(--size-icon-btn);
  min-width: var(--size-icon-btn);
  padding: 0;
  border: none;

  /* Typographic */
  font-size: var(--icon-size-inline);
  color: var(--color-text-body);

  /* Visual */
  background-color: transparent;
  border-radius: var(--border-radius-default);

  /* Misc */
  transition: background-color var(--duration-state) var(--ease-state);
}

/* 热区：透明 ::before 居中撑点击区，不改视觉尺寸（Desktop ≥32） */
.by-icon-btn.arco-btn::before {
  /* Positioning */
  position: absolute;
  top: 50%;
  left: 50%;

  /* Box Model */
  min-width: var(--size-icon-btn);
  min-height: var(--size-icon-btn);
  width: 100%;
  height: 100%;

  /* Misc */
  transform: translate(-50%, -50%);
  content: '';
}

/* hover：提亮至 surface 底（禁用态不触发） */
.by-icon-btn.arco-btn:not(.arco-btn-disabled):hover {
  background-color: var(--color-bg-surface);
  border: none;
}

/* active：按下加深至 --color-bg-active #DDDDDD（禁用态不触发） */
.by-icon-btn.arco-btn:not(.arco-btn-disabled):active {
  background-color: var(--color-bg-active);
  border: none;
}

/* 主操作：图标取主色 */
.by-icon-btn--primary.arco-btn {
  color: var(--color-primary);
}

/* 危险操作：图标取危险色 */
.by-icon-btn--danger.arco-btn {
  color: var(--color-danger);
}

/* 尺寸：large 40 / small 24 */
.by-icon-btn--large.arco-btn {
  width: 40px;
  height: 40px;
}

.by-icon-btn--small.arco-btn {
  width: 24px;
  height: 24px;
}

/* 禁用：保持原有颜色，不响应 hover / active / focus 的背景、边框或阴影变化。 */
.by-icon-btn.arco-btn.arco-btn-disabled,
.by-icon-btn.arco-btn.arco-btn-disabled:hover,
.by-icon-btn.arco-btn.arco-btn-disabled:active,
.by-icon-btn.arco-btn.arco-btn-disabled:focus,
.by-icon-btn.arco-btn.arco-btn-disabled:focus-visible {
  background-color: transparent;
  border: none;
  box-shadow: none;
  opacity: 0.4;
  cursor: not-allowed;
}

.by-icon-btn--primary.arco-btn.arco-btn-disabled,
.by-icon-btn--primary.arco-btn.arco-btn-disabled:hover,
.by-icon-btn--primary.arco-btn.arco-btn-disabled:active,
.by-icon-btn--primary.arco-btn.arco-btn-disabled:focus,
.by-icon-btn--primary.arco-btn.arco-btn-disabled:focus-visible {
  color: var(--color-primary);
}

.by-icon-btn--danger.arco-btn.arco-btn-disabled,
.by-icon-btn--danger.arco-btn.arco-btn-disabled:hover,
.by-icon-btn--danger.arco-btn.arco-btn-disabled:active,
.by-icon-btn--danger.arco-btn.arco-btn-disabled:focus,
.by-icon-btn--danger.arco-btn.arco-btn-disabled:focus-visible {
  color: var(--color-danger);
}

/* 三端点击区：Tablet ≥36 / Mobile ≥44（沿用项目断点） */
@media (width <= 1279px) {
  .by-icon-btn.arco-btn::before {
    min-width: 36px;
    min-height: 36px;
  }
}

@media (width <= 767px) {
  .by-icon-btn.arco-btn::before {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
