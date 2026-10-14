<template>
  <div class="ai-prefill-field" :class="{ 'ai-prefill-field--pending': isPending }">
    <div class="ai-prefill-field__control">
      <!-- 预填态：输入框套填充底；采纳/手动编辑后回归普通字段 -->
      <a-input
        class="ai-prefill-field__input"
        :model-value="innerValue"
        :placeholder="placeholder"
        :allow-clear="false"
        @update:model-value="onInput"
      />

      <!-- 待确认预填态：右侧「AI 预填」小标 + 采纳 / 忽略 -->
      <div v-if="isPending" class="ai-prefill-field__actions">
        <AiTag :text="TEXT.prefillTag" size="small" />
        <ByIconButton :tooltip="TEXT.adopt" type="primary" size="small" @click="onAdopt">
          <icon-check />
        </ByIconButton>
        <ByIconButton :tooltip="TEXT.ignore" size="small" @click="onIgnore">
          <icon-close />
        </ByIconButton>
      </div>

      <!-- 已采纳：短暂角标提示，随后收敛为普通字段（原则二：生成态与确认态可区分） -->
      <AiTag v-else-if="showAdopted" :text="TEXT.adoptedTag" size="small" class="ai-prefill-field__adopted" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AiTag from '@core/ai/components/AiTag.vue'
import ByIconButton from '@core/components/base/ByIconButton.vue'

/**
 * 嵌入式 AI · 预填字段（实施方案任务 4.7A / 规范 §02.2 原则五、原则二/原则三）。
 *
 * AI 生成值【直接显示在输入框内】，但处于「待确认预填态」：字段套填充底 + 右侧「AI 预填」小标，
 * 与人工录入的值视觉可辨。红线：预填值在采纳前【不算正式数据】——采纳、或用户主动编辑才算确认；
 * 未处理的预填字段对外暴露 pending=true，供表单提交时校验。
 * 三态：AI 预填待确认（填充底 + 小标 + 采纳/忽略）/ 已采纳（普通字段 + 短暂角标）/ 人工录入（无标识）。
 */
interface Props {
  /** 已确认值（v-model），采纳或人工录入后写入 */
  modelValue?: string
  /** AI 生成的预填值；非空且未处理时进入预填待确认态 */
  prefillValue?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  prefillValue: '',
  placeholder: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'adopt', value: string): void
  (e: 'ignore'): void
}>()

const TEXT = {
  prefillTag: 'AI 预填',
  adoptedTag: '已采纳',
  adopt: '采纳',
  ignore: '忽略',
}

// 已采纳角标短暂提示时长（走 Token 语义时长，避免裸值）
const ADOPTED_HINT_MS = 1600

// 本会话是否已处理该预填（采纳 / 忽略 / 手动编辑）；处理后不再回到待确认态
const handled = ref(false)
const showAdopted = ref(false)

// 待确认预填态：有预填值 且 尚未处理
const isPending = computed(() => !handled.value && props.prefillValue !== '')

// 对外暴露 pending：供表单提交时校验「有未采纳的 AI 预填，不算正式数据」（规范原则三）
defineExpose({ pending: isPending })

// 输入框展示值：待确认态显示预填值，否则显示已确认值
const innerValue = computed(() => (isPending.value ? props.prefillValue : props.modelValue))

// 外部换新预填值时重置为待确认态
watch(
  () => props.prefillValue,
  () => {
    handled.value = false
    showAdopted.value = false
  },
)

function flashAdopted() {
  showAdopted.value = true
  setTimeout(() => {
    showAdopted.value = false
  }, ADOPTED_HINT_MS)
}

function onAdopt() {
  handled.value = true
  emit('update:modelValue', props.prefillValue)
  emit('adopt', props.prefillValue)
  flashAdopted()
}

function onIgnore() {
  handled.value = true
  emit('update:modelValue', '')
  emit('ignore')
}

// 手动编辑即视为确认/改写：立即转人工录入态，填充底与小标消失
function onInput(value: string) {
  if (isPending.value) handled.value = true
  emit('update:modelValue', value)
}
import { Input as AInput } from '@arco-design/web-vue'
import { IconCheck, IconClose } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.ai-prefill-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.ai-prefill-field__control {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-prefill-field__input {
  flex: 1;
}

/* 待确认预填态：输入框套 AI 紫填充底 + 描边，标明「这是 AI 填的、待确认」 */
.ai-prefill-field--pending .ai-prefill-field__input :deep(.arco-input-wrapper) {
  background-color: var(--color-ai-light);
  border-color: var(--color-ai);
}

.ai-prefill-field__actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
</style>
