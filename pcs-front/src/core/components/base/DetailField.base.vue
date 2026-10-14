<template>
  <div class="detail-field">
    <span class="detail-field__label">{{ label }}</span>
    <div class="detail-field__value">
      <div
        ref="valueRef"
        class="detail-field__text"
        :class="expanded ? '' : `text-ellipsis-${clamp}`"
      >
        <slot>{{ value }}</slot>
      </div>
      <a-button
        v-if="overflowing"
        type="text"
        size="mini"
        class="detail-field__toggle"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起' : '展开' }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUpdated, nextTick } from 'vue'

withDefaults(
  defineProps<{
    label: string
    value?: string
    clamp?: 2 | 3
  }>(),
  { value: '', clamp: 3 },
)

const valueRef = ref<HTMLElement | null>(null)
const expanded = ref(false)
const overflowing = ref(false)

function measure() {
  const el = valueRef.value
  if (!el) return
  // 展开态下不重算，避免收起按钮闪烁
  if (expanded.value) return
  overflowing.value = el.scrollHeight > el.clientHeight + 1
}

onMounted(() => nextTick(measure))
onUpdated(() => measure())
import { Button as AButton } from '@arco-design/web-vue'
</script>

<style scoped>
.detail-field {
  /* Positioning */
  display: flex;
  flex-direction: column;

  /* Box Model */
  gap: var(--spacing-xs);
  min-width: 0;
}

.detail-field__label {
  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.detail-field__value {
  /* Positioning */
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  /* Box Model */
  gap: var(--spacing-xs);
  min-width: 0;
}

.detail-field__text {
  /* Box Model */
  width: 100%;

  /* Typographic */
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--color-text-body);
  overflow-wrap: break-word;
}

.detail-field__toggle {
  padding: 0;
}
</style>
