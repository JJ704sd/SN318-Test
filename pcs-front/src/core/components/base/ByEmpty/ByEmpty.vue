<template>
  <div class="by-empty" :class="[`by-empty--${size}`]">
    <div class="by-empty__icon">
      <SvgIcon :name="resolvedIcon" size="100%" />
    </div>
    <p v-if="resolvedTitle" class="by-empty__title">{{ resolvedTitle }}</p>
    <p v-if="resolvedDescription" class="by-empty__desc">{{ resolvedDescription }}</p>
    <div v-if="$slots.action" class="by-empty__action">
      <slot name="action" />
    </div>
    <div v-if="hasAiSlot" class="by-empty__ai">
      <slot name="aiSuggestion" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import SvgIcon from '../SvgIcon.vue'

export type EmptyPreset = 'noData' | 'noResult' | 'noAuth' | 'error'

interface Props {
  preset?: EmptyPreset
  title?: string
  description?: string
  size?: 'default' | 'small'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
})

const slots = useSlots()

const PRESET_MAP: Record<EmptyPreset, { icon: string; title: string; description?: string }> = {
  noData: {
    icon: 'empty-data',
    title: '暂无数据',
  },
  noResult: {
    icon: 'empty-search',
    title: '未找到相关结果',
    description: '请调整筛选条件后重试',
  },
  noAuth: {
    icon: 'empty-auth',
    title: '暂无访问权限',
    description: '请联系管理员开通',
  },
  error: {
    icon: 'empty-error',
    title: '加载失败',
    description: '请稍后重试',
  },
}

const resolvedTitle = computed(() => {
  if (props.title) return props.title
  return props.preset ? PRESET_MAP[props.preset].title : ''
})

const resolvedDescription = computed(() => {
  if (props.description !== undefined) return props.description
  if (!props.preset) return ''
  return PRESET_MAP[props.preset].description ?? ''
})

const resolvedIcon = computed(() =>
  props.preset ? PRESET_MAP[props.preset].icon : 'empty-data',
)

const hasAiSlot = computed(() => !!slots.aiSuggestion)
</script>

<style scoped>
/*
 * 空状态（对齐 SN318 empty-state-components.html）：
 * 居中插画 88×64 → 标题 14px/#4B5564 → 副文案 13px/#9DA3AE → 可选操作
 */
.by-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-2xl) var(--spacing-lg);
  text-align: center;
}

.by-empty--small {
  gap: var(--spacing-sm);
  padding: var(--spacing-xl) var(--spacing-md);
}

.by-empty__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--icon-size-empty-width);
  height: var(--icon-size-empty);
}

.by-empty--small .by-empty__icon {
  width: 66px;
  height: 48px;
}

.by-empty__icon :deep(.svg-icon) {
  width: 100%;
  height: 100%;
  fill: unset;
  vertical-align: top;
}

.by-empty__title {
  margin: 0;
  color: var(--color-text-body);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-base);
}

.by-empty__desc {
  margin: calc(var(--spacing-sm) * -1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-base);
}

.by-empty__action {
  margin-top: var(--spacing-xs);
}

.by-empty__ai {
  margin-top: var(--spacing-sm);
}
</style>
