<template>
  <div v-if="items.length > 0" class="quick-ask">
    <button
      v-for="(item, i) in normalizedItems"
      :key="`${item.value}-${i}`"
      type="button"
      class="quick-ask__pill"
      :disabled="disabled || item.disabled"
      @click="emit('ask', item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 运小星 · 快捷追问区（实施方案任务 4.10 / 规范 §11.3 浮层窗口结构）。
 *
 * 按需出现的胶囊按钮，横向排列、内容超出横向滚动，区高约 40-56px。
 * 点击仅 emit('ask', text) 上抛给面板发送，本组件不直接发消息（模板纯净）。
 */
interface QuickAskItem {
  label: string
  value: string
  disabled?: boolean
}

interface Props {
  /** 快捷追问文案列表；为空则不渲染 */
  items?: Array<string | QuickAskItem>
  /** 生成中禁用，避免打断当前流式 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  disabled: false,
})

const normalizedItems = computed<QuickAskItem[]>(() =>
  props.items.map((item) =>
    typeof item === 'string' ? { label: item, value: item, disabled: false } : item,
  ),
)

const emit = defineEmits<{
  (e: 'ask', text: string): void
}>()
</script>

<style scoped>
.quick-ask {
  /* Positioning */
  display: flex;
  flex-shrink: 0;
  gap: var(--spacing-sm);

  /* Box Model */
  padding: var(--spacing-sm) var(--spacing-md);

  /* Misc */
  overflow-x: auto;
}

.quick-ask__pill {
  /* Positioning */
  flex-shrink: 0;

  /* Box Model */
  padding: var(--spacing-xs) var(--spacing-md);
  border: var(--border-default);

  /* Typographic */
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
  color: var(--color-text-body);
  white-space: nowrap;

  /* Visual */
  background: var(--color-bg-card);
  border-radius: 999px;

  /* Misc */
  cursor: pointer;
  transition: border-color var(--duration-state) var(--ease-state);
}

.quick-ask__pill:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.quick-ask__pill:hover:not(:disabled) {
  border-color: var(--color-primary);
}
</style>
