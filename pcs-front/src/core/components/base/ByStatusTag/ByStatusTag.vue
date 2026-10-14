<template>
  <span
    class="by-status-tag"
    :class="[
      `by-status-tag--${status}`,
      size === 'small' && 'by-status-tag--small',
    ]"
  >
    <slot>{{ text }}</slot>
  </span>
</template>

<script setup lang="ts">
export type StatusType = 'success' | 'processing' | 'warning' | 'error' | 'default'
export type TagSize = 'default' | 'small'

interface Props {
  status: StatusType
  size?: TagSize
  text?: string
}

withDefaults(defineProps<Props>(), {
  size: 'default',
  text: '',
})
</script>

<style scoped>
/*
 * 语义状态 Tag（规范 §Tag）：浅底 + 深字 + 描边（字色 20% 透明度）
 * default 高 22 / 字 12 / 左右 8；small 高 18 / 字 10 / 左右 6
 * 注意：size 仅用 --small 修饰，禁止 --default，避免与 status=default 撞名
 */
.by-status-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  box-sizing: border-box;
  height: var(--tag-height-default); /* 22px */
  padding: 0 var(--tag-padding-x-default); /* 8px */
  border: 1px solid transparent;
  border-radius: var(--border-radius-default); /* 8px，规范 §Tag */

  font-size: var(--font-size-xs); /* 12px */
  font-weight: var(--font-weight-regular);
  line-height: 1;
  white-space: nowrap;
}

.by-status-tag--small {
  height: var(--tag-height-sm); /* 18px */
  padding: 0 var(--tag-padding-x-sm); /* 6px */

  font-size: var(--font-size-tag-sm); /* 10px */
}

.by-status-tag--processing {
  border-color: var(--color-info-border);

  color: var(--color-info);

  background-color: var(--color-info-bg);
}

.by-status-tag--success {
  border-color: var(--color-success-border);

  color: var(--color-success);

  background-color: var(--color-success-bg);
}

.by-status-tag--warning {
  border-color: var(--color-warning-border);

  color: var(--color-warning);

  background-color: var(--color-warning-bg);
}

.by-status-tag--error {
  border-color: var(--color-error-border);

  color: var(--color-error);

  background-color: var(--color-error-bg);
}

.by-status-tag--default {
  border-color: var(--color-neutral-tag-border);

  color: var(--color-text-body); /* #4B5564 */

  background-color: var(--color-bg-surface); /* #F7F7F7 */
}
</style>
