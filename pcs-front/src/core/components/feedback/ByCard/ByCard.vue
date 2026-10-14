<template>
  <div
    class="by-card"
    :class="{
      'by-card--default': variant === 'default' && !interactive,
      'by-card--outlined': variant === 'outlined' && !interactive,
      'by-card--interactive': variant === 'interactive' || interactive,
      'by-card--selected': (variant === 'interactive' || interactive) && selected,
      'by-card--no-padding': !bodyPadding,
    }"
  >
    <div v-if="title || $slots.header || $slots.extra" class="by-card__header">
      <div class="by-card__title">
        <slot name="header">{{ title }}</slot>
      </div>
      <div v-if="$slots.extra" class="by-card__extra">
        <slot name="extra" />
      </div>
    </div>
    <div class="by-card__body" :class="{ 'by-card__body--no-padding': !bodyPadding }">
      <slot />
    </div>
    <div v-if="$slots.footer" class="by-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  /** 卡片形态：默认仅白底；outlined 增加描边；interactive 支持交互反馈 */
  variant?: 'default' | 'outlined' | 'interactive'
  /** 兼容旧调用：为 true 时等同于 variant="interactive" */
  interactive?: boolean
  /** 选中态（仅 interactive 生效）：主色描边 + 外圈 */
  selected?: boolean
  bodyPadding?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  interactive: false,
  selected: false,
  bodyPadding: true,
})
</script>

<style scoped>
/* 规范 §05 卡片：三种形态共用白底、圆角与内边距 */
.by-card {
  padding: var(--card-padding);

  border-radius: var(--border-radius-card);

  background: var(--color-bg-card);
}

/* 默认态：仅白底，无描边、无阴影、无 hover 交互 */
.by-card--default {
  border: none;
  box-shadow: none;
}

/* 描边态：仅增加描边，不响应 hover */
.by-card--outlined {
  border: var(--border-default);
  box-shadow: none;
}

.by-card--no-padding {
  padding: 0;
}

/* 可交互态：整卡可点；仅此态启用 hover / active / focus / selected */
.by-card--interactive {
  border: var(--border-default);
  box-shadow: none;
  cursor: pointer;

  transition:
    box-shadow var(--duration-card) var(--ease-card),
    transform var(--duration-card) var(--ease-card),
    border-color var(--duration-card) var(--ease-card);
}

.by-card--interactive:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.by-card--interactive:active {
  transform: translateY(0);
}

.by-card--interactive:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
}

/* 选中：描边主色 + 1px 主色外圈 */
.by-card--interactive.by-card--selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary), var(--shadow-card-hover);
}

@media (prefers-reduced-motion: reduce) {
  .by-card--interactive {
    transition:
      box-shadow var(--duration-state) linear,
      border-color var(--duration-state) linear;
  }

  .by-card--interactive:hover,
  .by-card--interactive:active {
    transform: none;
  }
}

.by-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);

  margin-bottom: var(--spacing-md); /* 标题 → 内容 16px，无底部分割线 */
}

.by-card__title {
  font-size: var(--font-size-h2); /* 16px */
  font-weight: var(--font-weight-medium); /* 500 */
  line-height: var(--line-height-h2);
  color: var(--color-text-title); /* #1A2130 */
}

.by-card__body {
  padding: 0;
}

.by-card__body--no-padding {
  padding: 0;
}

.by-card__footer {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: var(--border-divider);
}
</style>
