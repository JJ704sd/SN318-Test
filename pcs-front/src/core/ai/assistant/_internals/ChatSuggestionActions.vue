<template>
  <div class="chat-suggestion-actions" aria-label="AI 建议操作">
    <a-button class="chat-suggestion-actions__accept" type="primary" size="small" @click="emit('accept')">
      <icon-check :size="14" />
      采纳建议
    </a-button>
    <a-button type="secondary" size="small" @click="emit('ignore')">忽略</a-button>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'accept'): void
  (e: 'ignore'): void
}>()

import { Button as AButton } from '@arco-design/web-vue'
import { IconCheck } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.chat-suggestion-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.chat-suggestion-actions :deep(.arco-btn) {
  gap: var(--spacing-xs);
}

.chat-suggestion-actions__accept.arco-btn {
  border-color: transparent;
  background: linear-gradient(135deg, var(--color-primary), var(--color-ai));
  color: var(--color-text-on-overlay);
}

.chat-suggestion-actions__accept.arco-btn:not(.arco-btn-disabled):hover,
.chat-suggestion-actions__accept.arco-btn:not(.arco-btn-disabled):focus-visible {
  border-color: transparent;
  background: linear-gradient(135deg, var(--color-primary-hover), var(--color-ai));
  color: var(--color-text-on-overlay);
}
</style>
