<template>
  <section class="ai-summary-card" :aria-label="title">
    <header class="ai-summary-card__head">
      <div class="ai-summary-card__head-left">
        <SvgIcon name="ai-sparkle" class="ai-summary-card__icon" />
        <h3 class="ai-summary-card__title">{{ title }}</h3>
      </div>
      <!-- ③ 右上角「AI 生成」角标 -->
      <AiTag :text="TEXT.generatedBadge" size="small" />
    </header>

    <div class="ai-summary-card__body">
      <!-- 加载中：连接/思考阶段 -->
      <div v-if="loading" class="ai-summary-card__loading">
        <AiThinkingDots />
        <span class="ai-summary-card__loading-text">{{ TEXT.loading }}</span>
      </div>

      <!-- 失败：仅重试，不含任何执行动作 -->
      <div v-else-if="error" class="ai-summary-card__error">
        <span class="ai-summary-card__error-text">{{ TEXT.error }}</span>
        <a-button type="text" size="mini" @click="generate">{{ TEXT.retry }}</a-button>
      </div>

      <!-- ④ 内容带「AI 建议」前缀 + 流式光标 -->
      <p v-else class="ai-summary-card__text">
        <span class="ai-summary-card__prefix">{{ TEXT.suggestPrefix }}</span>
        <span class="ai-summary-card__content">{{ summary }}</span>
        <AiStreamCursor v-if="streaming" />
      </p>
    </div>

    <footer class="ai-summary-card__foot">
      <!-- ⑤ 注明依据（AI 非黑盒） -->
      <p v-if="evidence" class="ai-summary-card__evidence">{{ evidence }}</p>
      <p class="ai-summary-card__disclaimer">{{ TEXT.disclaimer }}</p>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAiService } from '@core/ai/service/useAiService'
import AiTag from '@core/ai/components/AiTag.vue'
import AiThinkingDots from '@core/ai/components/AiThinkingDots.vue'
import AiStreamCursor from '@core/ai/components/AiStreamCursor.vue'
import SvgIcon from '@core/components/base/SvgIcon.vue'

const TEXT = {
  suggestPrefix: 'AI 建议：',
  generatedBadge: 'AI 生成',
  loading: '正在生成摘要',
  error: 'AI 分析超时，请重试',
  retry: '重试',
  disclaimer: 'AI 生成，仅供参考',
} as const

/**
 * 嵌入式 AI · 智能摘要卡片（实施方案任务 5.5 / 规范 §10 AI 建议卡片、§02.2 原则五）。
 *
 * 规范 §10 定义的标准「AI 建议卡片」形态：浅蓝紫渐变独立卡片 + 轻描边 + 右上角「AI 生成」角标
 * + 内容带「AI 建议」前缀 + 注明依据。只读能力——对上下文数据生成摘要/风险提示，
 * 不含任何可执行动作、不走「建议→确认→执行」链。列表空态原因建议 / 仪表盘洞察等
 * 只读场景复用同一视觉规格。
 */
interface Props {
  /** 摘要上下文（键值对，序列化后随提示词发给 AI；真实适配器据此生成） */
  context?: Record<string, string>
  /** 依据文案，如「基于本单基础信息与物流轨迹」 */
  evidence?: string
  /** 卡片标题（默认「AI 智能摘要」；仪表盘复用时可传「AI 数据洞察」） */
  title?: string
  /** 挂载后是否自动生成摘要 */
  autoGenerate?: boolean
}

// withDefaults 第二参数会被编译器 hoist 到 setup() 外部，禁止引用 setup 内的 TEXT 局部变量；
// evidence/title 的默认值用字面量内联，TEXT 中相应字段已无其他引用点故未保留。
const props = withDefaults(defineProps<Props>(), {
  context: undefined,
  evidence: '基于本单基础信息与物流轨迹生成',
  title: 'AI 智能摘要',
  autoGenerate: true,
})

const { service } = useAiService()

const summary = ref('')
const loading = ref(false)
const streaming = ref(false)
const error = ref(false)

// 将上下文键值对拼进提示词；含「摘要」关键词以驱动只读摘要生成
const prompt = computed(() => {
  const facts = props.context
    ? Object.entries(props.context)
        .map(([label, value]) => `${label}：${value}`)
        .join('，')
    : ''
  return `请基于以下信息生成简要摘要与风险提示：${facts}`
})

async function generate() {
  loading.value = true
  error.value = false
  summary.value = ''
  try {
    await service.value.sendMessage({
      content: prompt.value,
      onStart: () => {
        loading.value = false
        streaming.value = true
      },
      onChunk: (chunk) => {
        if (!chunk.done) summary.value += chunk.delta
      },
    })
  } catch {
    error.value = true
  } finally {
    loading.value = false
    streaming.value = false
  }
}

onMounted(() => {
  if (props.autoGenerate) generate()
})

// context / title 变化时重新生成，支持仪表盘等异步加载场景
watch(prompt, (next, prev) => {
  if (next && next !== prev && props.autoGenerate) generate()
})
import { Button as AButton } from '@arco-design/web-vue'
</script>

<style scoped>
.ai-summary-card {
  /* Positioning */
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  /* Box Model */
  padding: var(--spacing-md);
  border: 1px solid color-mix(in srgb, var(--color-ai) 30%, transparent);

  /* Visual */
  background: linear-gradient(135deg, var(--color-ai-light), var(--color-bg-card));
  border-radius: var(--border-radius-card);
}

.ai-summary-card__head {
  /* Positioning */
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.ai-summary-card__head-left {
  /* Positioning */
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.ai-summary-card__icon {
  /* Box Model */
  width: var(--icon-size-action);
  height: var(--icon-size-action);

  /* Typographic */
  color: var(--color-ai);
}

.ai-summary-card__title {
  /* Box Model */
  margin: 0;

  /* Typographic */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.ai-summary-card__loading {
  /* Positioning */
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-summary-card__loading-text {
  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.ai-summary-card__error {
  /* Positioning */
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.ai-summary-card__error-text {
  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.ai-summary-card__text {
  /* Box Model */
  margin: 0;

  /* Typographic */
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  color: var(--color-text-body);
}

.ai-summary-card__prefix {
  /* Typographic */
  font-weight: var(--font-weight-medium);
  color: var(--color-ai);
}

.ai-summary-card__foot {
  /* Positioning */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  /* Box Model */
  padding-top: var(--spacing-sm);
  border-top: 1px solid color-mix(in srgb, var(--color-ai) 15%, transparent);
}

.ai-summary-card__evidence,
.ai-summary-card__disclaimer {
  /* Box Model */
  margin: 0;

  /* Typographic */
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
