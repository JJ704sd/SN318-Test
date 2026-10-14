<template>
  <span class="ai-tag" :class="{ 'ai-tag--small': size === 'small' }">
    <SvgIcon name="ai-sparkle" class="ai-tag__icon" />
    <span v-if="showText" class="ai-tag__text"><slot>{{ text }}</slot></span>
  </span>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import SvgIcon from '@core/components/base/SvgIcon.vue'

/**
 * AI 能力标识徽标（实施方案任务 4.6 / 规范 §3.1 AI 紫色系、§10 AI 视觉标识）。
 *
 * 统一用 AI 紫色系（--color-ai / --color-ai-light）与四芒星标记（ai-sparkle），
 * 让用户一眼区分「这是 AI 能力」。供嵌入式 AI 与对话式运小星复用。
 * 文案默认「AI 生成」，可传 text 或默认插槽覆盖（如「AI 建议」「AI 预填」「AI 风险提示」）。
 */
interface Props {
  /** 徽标文字，默认「AI 生成」；传空字符串则只显示四芒星图标 */
  text?: string
  size?: 'default' | 'small'
}

const props = withDefaults(defineProps<Props>(), {
  text: 'AI 生成',
  size: 'default',
})

const slots = useSlots()
// 有插槽或非空 text 时才渲染文字区，否则退化为纯图标标记
const showText = computed(() => Boolean(slots.default) || props.text !== '')
</script>

<style scoped>
.ai-tag {
  /* Positioning */
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);

  /* Box Model */
  height: 22px;
  padding: 0 var(--spacing-sm);

  /* Typographic */
  font-size: var(--font-size-xs);
  line-height: 1;
  color: var(--color-ai);
  white-space: nowrap;

  /* Visual */
  background: var(--color-ai-light);
  border-radius: var(--border-radius-default);
}

.ai-tag--small {
  height: 18px;
  padding: 0 6px;

  font-size: var(--font-size-tag-sm);
}

.ai-tag__icon {
  width: var(--icon-size-inline);
  height: var(--icon-size-inline);
}

.ai-tag--small .ai-tag__icon {
  width: 12px;
  height: 12px;
}
</style>
