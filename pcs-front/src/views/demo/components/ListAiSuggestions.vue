<template>
  <div class="list-ai-suggestions">
    <div class="list-ai-suggestions__head">
      <AiTag :text="TEXT.tag" size="small" />
      <span class="list-ai-suggestions__title">{{ TEXT.title }}</span>
      <a-button
        class="list-ai-suggestions__close"
        type="text"
        size="mini"
        @click="emit('close')"
      >
        <template #icon><icon-close /></template>
      </a-button>
    </div>

    <a-spin v-if="loading" :loading="true" class="list-ai-suggestions__loading" />
    <ByEmpty v-else-if="suggestions.length === 0" preset="noData" size="small" :title="TEXT.empty" />
    <ul v-else class="list-ai-suggestions__list">
      <li v-for="s in suggestions" :key="s.id" class="list-ai-suggestions__item">
        <div class="list-ai-suggestions__item-main">
          <div class="list-ai-suggestions__item-head">
            <p class="list-ai-suggestions__item-title">{{ s.title }}</p>
            <span v-if="s.riskLevel === 'high'" class="list-ai-suggestions__item-risk">
              {{ TEXT.highRisk }}
            </span>
          </div>
          <p class="list-ai-suggestions__item-desc">{{ s.description }}</p>
        </div>
        <!-- 采纳才把建议转为待确认；绝不自动执行 -->
        <a-button type="primary" size="mini" :disabled="!s.action" @click="emit('apply', s)">
          {{ TEXT.apply }}
        </a-button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { AiTag } from '@core/ai'
import { ByEmpty } from '@core/components'
import type { AiSuggestion } from '@core/ai'

/**
 * 列表页 AI 批量建议面板（实施方案任务 5.3 / 规范 §10 嵌入式 AI、§02.2 原则三）。
 *
 * 仅承载「拉到建议后 -> 用户采纳前」的展示与采纳交互；建议本身【不产生副作用】，
 * 用户点「采纳」才 emit apply 由父组件调 proposeAction 进入待确认态，
 * 后续「确认 -> 执行」交给 AiActionBar，禁止在此短路执行。
 */
interface Props {
  loading: boolean
  suggestions: AiSuggestion[]
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'apply', value: AiSuggestion): void
  (e: 'close'): void
}>()

const TEXT = {
  tag: 'AI 建议',
  title: '可执行的批量操作',
  apply: '采纳',
  empty: '暂无建议',
  highRisk: '高风险',
}
</script>

<style scoped>
.list-ai-suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-ai-light);
  border-radius: var(--border-radius-default);

  background: var(--color-bg-card);
}

.list-ai-suggestions__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.list-ai-suggestions__title {
  flex: 1;

  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.list-ai-suggestions__close {
  color: var(--color-text-secondary);
}

.list-ai-suggestions__loading {
  display: flex;
  justify-content: center;

  padding: var(--spacing-md);
}

.list-ai-suggestions__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  margin: 0;
  padding: 0;

  list-style: none;
}

.list-ai-suggestions__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);

  padding: var(--spacing-xs) 0;
}

.list-ai-suggestions__item-main {
  flex: 1;
  min-width: 0;
}

.list-ai-suggestions__item-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.list-ai-suggestions__item-title {
  margin: 0;

  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-body);
}

.list-ai-suggestions__item-risk {
  font-size: var(--font-size-xs);
  color: var(--color-error);
}

.list-ai-suggestions__item-desc {
  margin: var(--spacing-xs) 0 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
