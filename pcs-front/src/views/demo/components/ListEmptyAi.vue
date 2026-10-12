<template>
  <div class="list-empty-ai">
    <div class="list-empty-ai__head">
      <AiTag :text="TEXT.tag" size="small" />
    </div>

    <!-- 思考态：AiThinkingDots 三点脉冲 -->
    <div v-if="loading" class="list-empty-ai__loading">
      <AiThinkingDots />
      <span class="list-empty-ai__loading-text">{{ TEXT.loading }}</span>
    </div>

    <!-- 失败：可重试 -->
    <div v-else-if="error" class="list-empty-ai__error">
      <span class="list-empty-ai__error-text">{{ TEXT.error }}</span>
      <a-button type="text" size="mini" @click="fetch">{{ TEXT.retry }}</a-button>
    </div>

    <!-- 摘要：可能原因 + 建议（只读，不引入执行动作） -->
    <div v-else class="list-empty-ai__body">
      <p class="list-empty-ai__text">
        <span class="list-empty-ai__prefix">{{ TEXT.prefix }}</span>
        {{ suggestion?.description ?? TEXT.fallback }}
      </p>
      <a-button
        v-if="hasActiveFilter"
        type="text"
        size="mini"
        class="list-empty-ai__relax"
        @click="emit('relax')"
      >
        {{ TEXT.relax }}
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAiService, AiTag, AiThinkingDots } from '@baiyun/template-core/ai'
import type { AiSuggestion } from '@baiyun/template-core/ai'

/**
 * 列表空态 AI 建议组件（任务 5.3A / 规范 §02.2 空状态、原则五只读型建议）。
 *
 * 当筛选后无结果时，通过 ByEmpty 的 aiSuggestion 插槽渲染：
 * 调 AI 生成「可能原因 + 下一步操作建议」文本（紫色系轻容器由 ByEmpty 提供），
 * 区别于纯静态「未找到结果」文案；附「一键放宽」按钮（仅当有可放宽条件时显示），
 * 点击 emit('relax') 由父组件回填放宽后的条件，仍走用户确认查询。
 *
 * 红线：只读型建议，不引入任何执行动作；不走「建议 -> 确认 -> 执行」链。
 */

interface Props {
  /** 当前是否有可放宽的筛选条件（false 时隐藏「一键放宽」按钮） */
  hasActiveFilter?: boolean
}

withDefaults(defineProps<Props>(), {
  hasActiveFilter: false,
})

const emit = defineEmits<{
  (e: 'relax'): void
}>()

const TEXT = {
  tag: 'AI 建议',
  loading: '运小星正在分析…',
  error: 'AI 分析超时，请重试',
  retry: '重试',
  prefix: 'AI 建议：',
  relax: '一键放宽筛选',
  fallback: '可能因筛选条件过严导致无结果，建议放宽筛选后重试。',
} as const

const EMPTY_SUGGESTION_SCENE = 'list.empty-suggestion'

const { service } = useAiService()

const loading = ref(false)
const error = ref(false)
const suggestion = ref<AiSuggestion | null>(null)

async function fetch() {
  loading.value = true
  error.value = false
  try {
    const list = await service.value.requestSuggestions({ scene: EMPTY_SUGGESTION_SCENE })
    suggestion.value = list[0] ?? null
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetch)
</script>

<style scoped>
.list-empty-ai {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);

  text-align: left;
}

.list-empty-ai__head {
  margin-bottom: var(--spacing-xs);
}

.list-empty-ai__loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.list-empty-ai__loading-text {
  font-size: var(--font-size-sm);
  color: var(--color-ai);
}

.list-empty-ai__error {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.list-empty-ai__error-text {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.list-empty-ai__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-xs);
}

.list-empty-ai__text {
  margin: 0;

  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  color: var(--color-ai);
}

.list-empty-ai__prefix {
  font-weight: var(--font-weight-medium);
}

.list-empty-ai__relax {
  color: var(--color-ai);
}
</style>
