<template>
  <div class="ai-suggest-input">
    <!-- 被包裹的表单字段 -->
    <div class="ai-suggest-input__field">
      <slot />
      <!-- 主动触发按钮：三态下始终存在（规范 §10 就地浮现，禁止 FAB / 独立 AI 菜单） -->
      <a-button
        class="ai-suggest-input__trigger"
        type="text"
        size="mini"
        :loading="loading"
        @click="onTrigger"
      >
        <template #icon><SvgIcon name="ai-sparkle" /></template>
        {{ TEXT.trigger }}
      </a-button>
    </div>

    <!-- 主动浮现气泡 / 手动展开的建议区（可关闭） -->
    <div v-if="showPanel" class="ai-suggest-input__panel">
      <div class="ai-suggest-input__panel-head">
        <AiTag :text="proactive && !manualOpen ? TEXT.proactiveTag : TEXT.suggestTag" />
        <a-button
          class="ai-suggest-input__close"
          type="text"
          size="mini"
          @click="onDismiss"
        >
          <template #icon><icon-close /></template>
        </a-button>
      </div>

      <a-spin v-if="loading" :loading="true" class="ai-suggest-input__loading" />
      <ByEmpty v-else-if="visibleSuggestions.length === 0" preset="noData" size="small" :title="TEXT.empty" />
      <ul v-else class="ai-suggest-input__list">
        <li v-for="s in visibleSuggestions" :key="s.id" class="ai-suggest-input__item">
          <div class="ai-suggest-input__item-main">
            <p class="ai-suggest-input__item-title">{{ s.title }}</p>
            <p class="ai-suggest-input__item-desc">{{ s.description }}</p>
          </div>
          <!-- 采纳才写入（用户的「确认」动作）；绝不自动填入 -->
          <a-button type="primary" size="mini" @click="onApply(s)">{{ TEXT.apply }}</a-button>
        </li>
      </ul>
    </div>

    <!-- 已忽略态：内容收起，仅保留提示行 + 重新查看（规范 §02.2 原则二） -->
    <div v-else-if="dismissed" class="ai-suggest-input__dismissed">
      <span class="ai-suggest-input__dismissed-text">{{ TEXT.dismissed }}</span>
      <a-button type="text" size="mini" @click="onReopen">{{ TEXT.reopen }}</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAiStore } from '@core/ai/store'
import SvgIcon from '@core/components/base/SvgIcon.vue'
import AiTag from '@core/ai/components/AiTag.vue'
import ByEmpty from '@core/components/base/ByEmpty/ByEmpty.vue'
import type { AiSuggestion } from '@core/ai/service/types'

/**
 * 嵌入式 AI · 输入建议（实施方案任务 4.7 / 规范 §10、§02.2 原则二/原则三）。
 *
 * 包裹表单字段，就地提供「AI 建议填写」。红线：建议【绝不自动填入】，
 * 用户点「采纳」才 emit apply 由父组件写入字段（这一步即「确认」）。
 * 三态：可触发（默认）/ 主动浮现建议中 / 已忽略（收起 + 提示行）。
 * 就地浮现，禁止 FAB / 独立 AI 菜单（那是对话式运小星专属形态）。
 */
interface Props {
  /** 建议场景 key，透传给 ai store 的 fetchSuggestions */
  scene: string
  /** 场景上下文 */
  context?: Record<string, unknown>
  /** 主动浮现开关：为 true 且未被忽略时，自动展示一条轻量建议气泡 */
  proactive?: boolean
  /**
   * 字段过滤：传入后仅展示 action.payload.field 等于该值的建议。
   * 用于同一 scene 下多个 AiSuggestInput 实例各管一个字段的场景（任务 5.7）。
   * 不传时展示全部建议（向后兼容）。
   */
  field?: string
}

const props = withDefaults(defineProps<Props>(), {
  context: undefined,
  proactive: false,
  field: undefined,
})

const emit = defineEmits<{
  (e: 'apply', value: AiSuggestion): void
  (e: 'dismiss'): void
}>()

const TEXT = {
  trigger: 'AI 建议',
  suggestTag: 'AI 建议',
  proactiveTag: 'AI 建议',
  apply: '采纳',
  empty: '暂无建议',
  dismissed: '已忽略 AI 建议',
  reopen: '重新查看',
}

const aiStore = useAiStore()
const { suggestions, status } = storeToRefs(aiStore)

const loading = computed(() => status.value === 'requesting' || status.value === 'thinking')

/**
 * 按 field prop 过滤建议：传了 field 时仅展示 action.payload.field 匹配的建议。
 * 用于同一 scene 下多个实例各管一个字段的场景（任务 5.7）。
 * 不传 field 时展示全部建议（向后兼容）。
 */
const visibleSuggestions = computed(() => {
  if (!props.field) return suggestions.value
  return suggestions.value.filter((s) => {
    const payload = s.action?.payload as { field?: unknown } | undefined
    return payload?.field === props.field
  })
})

// 手动打开（点触发按钮）；本会话已忽略（关闭主动浮现后不再自动弹）
const manualOpen = ref(false)
const dismissed = ref(false)

// 展示建议区的条件：手动打开，或（主动浮现开启 且 本会话未忽略）
const showPanel = computed(() => manualOpen.value || (props.proactive && !dismissed.value))

async function fetchIfNeeded() {
  await aiStore.fetchSuggestions(props.scene, props.context)
}

async function onTrigger() {
  manualOpen.value = true
  await fetchIfNeeded()
}

// 主动浮现：proactive 变为 true 且未忽略时自动拉取一次
watch(
  () => props.proactive,
  (val) => {
    if (val && !dismissed.value) fetchIfNeeded()
  },
  { immediate: true },
)

function onApply(s: AiSuggestion) {
  // 只 emit，由父组件决定写入——组件本身绝不改字段值
  emit('apply', s)
}

function onDismiss() {
  manualOpen.value = false
  dismissed.value = true
  emit('dismiss')
}

function onReopen() {
  dismissed.value = false
  manualOpen.value = true
  fetchIfNeeded()
}
import { Button as AButton, Spin as ASpin } from '@arco-design/web-vue'
import { IconClose } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.ai-suggest-input {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.ai-suggest-input__field {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-suggest-input__trigger {
  color: var(--color-ai);
}

.ai-suggest-input__panel {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-ai-light);
  border-radius: var(--border-radius-default);

  background: var(--color-bg-card);
}

.ai-suggest-input__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: var(--spacing-sm);
}

.ai-suggest-input__close {
  color: var(--color-text-secondary);
}

.ai-suggest-input__loading {
  display: flex;
  justify-content: center;

  padding: var(--spacing-md);
}

.ai-suggest-input__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  margin: 0;
  padding: 0;

  list-style: none;
}

.ai-suggest-input__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.ai-suggest-input__item-title {
  margin: 0;

  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-body);
}

.ai-suggest-input__item-desc {
  margin: var(--spacing-xs) 0 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.ai-suggest-input__dismissed {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
</style>
