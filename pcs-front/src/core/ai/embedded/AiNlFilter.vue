<template>
  <div class="ai-nl-filter">
    <div class="ai-nl-filter__head">
      <AiTag :text="TEXT.tag" size="small" />
      <span class="ai-nl-filter__label">{{ TEXT.label }}</span>
    </div>

    <div class="ai-nl-filter__input-row">
      <a-input
        v-model="inputText"
        :placeholder="TEXT.placeholder"
        allow-clear
        @press-enter="onParse"
      />
      <a-button
        type="primary"
        :loading="status === 'parsing'"
        :disabled="!inputText.trim()"
        @click="onParse"
      >
        <template #icon><SvgIcon name="ai-sparkle" /></template>
        {{ TEXT.parse }}
      </a-button>
    </div>

    <!-- 思考态：AiActiveContainer 蓝紫流光 + AiThinkingDots 三点脉冲（与 AiStatusIndicator 子组件同款） -->
    <AiActiveContainer v-if="status === 'parsing'" :flowing="true" class="ai-nl-filter__status">
      <div class="ai-nl-filter__status-row">
        <AiThinkingDots />
        <span class="ai-nl-filter__status-text">{{ TEXT.thinking }}</span>
      </div>
    </AiActiveContainer>

    <!-- 失败态：错误文案 + 重试 -->
    <div v-else-if="status === 'failed'" class="ai-nl-filter__error">
      <span class="ai-nl-filter__error-text">{{ TEXT.error }}</span>
      <a-button type="text" size="mini" @click="onParse">{{ TEXT.retry }}</a-button>
    </div>

    <!-- 解析成功：条件 Tag 展示（同步 emit 给父组件回填筛选控件） -->
    <div v-else-if="status === 'parsed' && parsedConditions" class="ai-nl-filter__result">
      <div class="ai-nl-filter__result-head">
        <span class="ai-nl-filter__result-label">{{ TEXT.parsedLabel }}</span>
        <a-button type="text" size="mini" class="ai-nl-filter__clear" @click="onClear">
          {{ TEXT.clear }}
        </a-button>
      </div>
      <div class="ai-nl-filter__tags">
        <span v-for="tag in parsedTags" :key="tag.label" class="ai-nl-filter__tag">
          <span class="ai-nl-filter__tag-label">{{ tag.label }}</span>
          <span class="ai-nl-filter__tag-value">{{ tag.value }}</span>
        </span>
      </div>
      <p class="ai-nl-filter__hint">{{ TEXT.hint }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import type { BizType } from '@core/styles/tokens'
import type { WaybillStatus, NlFilterConditions } from '@core/ai/service/types'

/** 自然语言筛选场景 key（MockAiAdapter 据此走 pickNlFilterSuggestion 解析路径） */
export const LIST_NL_FILTER_SCENE = 'list.nl-filter'
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button as AButton, Input as AInput } from '@arco-design/web-vue'
import { useAiService } from '@core/ai/service/useAiService'
import AiTag from '@core/ai/components/AiTag.vue'
import AiActiveContainer from '@core/ai/components/AiActiveContainer.vue'
import AiThinkingDots from '@core/ai/components/AiThinkingDots.vue'
import SvgIcon from '@core/components/base/SvgIcon.vue'

/**
 * 嵌入式 AI · 自然语言筛选（实施方案任务 5.3A / 规范 §02.2 AI 原生应用、原则三）。
 *
 * 筛选区的自然语言输入组件：AI 把自然语言解析为结构化筛选条件并回填到 ByForm 控件，
 * 解析结果以条件 Tag 呈现让用户看清"AI 理解成了什么"。
 *
 * 红线（规范 §02.2 原则三）：解析结果【不直接查询】，emit 给父组件回填筛选控件，
 * 用户确认/微调后点查询才执行--保持"建议 -> 确认 -> 执行"三步链。
 *
 * 思考态用 AiActiveContainer + AiThinkingDots（与 AiStatusIndicator 子组件同款），
 * 不依赖 ai store 全局 status--避免与列表页其他 AI 操作（批量动作建议）冲突。
 */

type ParseStatus = 'idle' | 'parsing' | 'parsed' | 'failed'

const TEXT = {
  tag: 'AI 解析',
  label: '自然语言筛选',
  placeholder: '如：上周日本线的所有异常单',
  parse: '解析',
  thinking: '运小星正在解析…',
  error: 'AI 解析超时，请重试',
  retry: '重试',
  parsedLabel: 'AI 解析结果：',
  clear: '清除',
  hint: '已回填筛选条件，可在控件上微调后点查询',
} as const

const emit = defineEmits<{
  (e: 'parsed', value: NlFilterConditions): void
  (e: 'clear'): void
}>()

const { service } = useAiService()

const inputText = ref('')
const status = ref<ParseStatus>('idle')
const parsedConditions = ref<NlFilterConditions | null>(null)

/** 条件 Tag 展示数据（来自建议的 evidence，已过滤掉空字段） */
const parsedTags = computed(() => {
  if (!parsedConditions.value) return []
  const tags: Array<{ label: string; value: string }> = []
  const c = parsedConditions.value
  if (c.bizType) tags.push({ label: '业务类型', value: BIZ_TYPE_LABEL[c.bizType as BizType] ?? c.bizType })
  if (c.status) tags.push({ label: '状态', value: STATUS_LABEL[c.status as WaybillStatus] ?? c.status })
  if (c.dateRange) tags.push({ label: '时间范围', value: c.dateRange.join(' ~ ') })
  if (c.keyword) tags.push({ label: '关键词', value: c.keyword })
  return tags
})

async function onParse() {
  const text = inputText.value.trim()
  if (!text || status.value === 'parsing') return

  status.value = 'parsing'
  parsedConditions.value = null

  try {
    const suggestions = await service.value.requestSuggestions({
      scene: LIST_NL_FILTER_SCENE,
      context: { text },
    })
    const suggestion = suggestions[0]
    if (!suggestion?.action) {
      status.value = 'failed'
      return
    }
    // action.payload 承载结构化条件；类型层是 unknown，这里按契约断言
    const conditions = suggestion.action.payload as unknown as NlFilterConditions
    parsedConditions.value = conditions
    status.value = 'parsed'
    // emit 给父组件回填筛选控件；不直接查询（用户确认/微调后点查询才执行）
    emit('parsed', conditions)
  } catch {
    status.value = 'failed'
  }
}

function onClear() {
  parsedConditions.value = null
  status.value = 'idle'
  emit('clear')
}

// 业务类型/状态枚举值 -> 中文展示（与 listConfig.ts 选项一致）
const BIZ_TYPE_LABEL: Record<BizType, string> = {
  express: '快递',
  air: '空运',
  fba: 'FBA',
  line: '专线',
  sea: '海运',
  pickup: '上门取件',
  inquiry: '询价',
}

const STATUS_LABEL: Record<WaybillStatus, string> = {
  pending: '待揽收',
  picked_up: '已揽收',
  in_transit: '运输中',
  delivered: '已签收',
  exception: '异常',
}
</script>

<style scoped>
.ai-nl-filter {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  padding: var(--spacing-md);
  border: 1px solid var(--color-ai-light);
  border-radius: var(--border-radius-default);

  background: var(--color-bg-card);
}

.ai-nl-filter__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-nl-filter__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.ai-nl-filter__input-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-nl-filter__status {
  padding: var(--spacing-sm) var(--spacing-md);
}

.ai-nl-filter__status-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-nl-filter__status-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.ai-nl-filter__error {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);

  padding: var(--spacing-sm) var(--spacing-md);

  font-size: var(--font-size-sm);
}

.ai-nl-filter__error-text {
  color: var(--color-error);
}

.ai-nl-filter__result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.ai-nl-filter__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-nl-filter__result-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.ai-nl-filter__clear {
  color: var(--color-text-secondary);
}

.ai-nl-filter__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.ai-nl-filter__tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);

  height: 24px;
  padding: 0 var(--spacing-sm);

  font-size: var(--font-size-xs);
  line-height: 1;
  color: var(--color-ai);
  white-space: nowrap;

  background: var(--color-ai-light);
  border-radius: var(--border-radius-default);
}

.ai-nl-filter__tag-label {
  color: var(--color-text-secondary);
}

.ai-nl-filter__tag-value {
  font-weight: var(--font-weight-medium);
}

.ai-nl-filter__hint {
  margin: 0;

  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
