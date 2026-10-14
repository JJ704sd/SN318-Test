<template>
  <!-- idle / awaitingUser 不由本组件渲染：idle 无状态；awaitingUser 的高亮建议/授权卡片由 AiActionBar 承载（规范 §02.2 原则四） -->
  <div v-if="visible" class="ai-status">
    <!-- 进行态（requesting/thinking/streaming/executing/timeoutServer）：AiActiveContainer 承载，进行时蓝紫流光、requesting 无流光 -->
    <AiActiveContainer v-if="useActiveContainer" :flowing="flowing">
      <!-- 停止/取消锚点固定右上角，不随流式内容跳动（timeoutServer 走底部按钮，此处无 topAction） -->
      <template v-if="topAction" #action>
        <a-button class="ai-status__anchor-btn" type="text" size="mini" @click="onTopAction">
          {{ topActionText }}
        </a-button>
      </template>

      <div class="ai-status__row">
        <AiPingWave v-if="status === 'requesting'" />
        <AiThinkingDots v-else-if="showDots" />
        <span class="ai-status__label">{{ label }}</span>
        <AiStreamCursor v-if="status === 'streaming'" />
      </div>

      <!-- 服务器超时：底部「继续等待 / 停止」，不引导重试（服务端仍在处理，避免重复请求） -->
      <div v-if="status === 'timeoutServer'" class="ai-status__footer">
        <a-button type="primary" size="small" @click="emit('keepWaiting')">
          {{ TEXT.keepWaiting }}
        </a-button>
        <a-button type="secondary" size="small" @click="emit('stop')">
          {{ TEXT.stop }}
        </a-button>
      </div>
    </AiActiveContainer>

    <!-- 完成态：内容静止 + 「AI 建议」角标 -->
    <div v-else-if="status === 'done'" class="ai-status__done">
      <AiTag :text="TEXT.suggestionBadge" size="small" />
    </div>

    <!-- 中断态：中性「已停止」角标（禁止红色）+「继续 / 重新生成」，继续=主按钮、重新生成=次按钮 -->
    <div v-else-if="status === 'aborted'" class="ai-status__panel ai-status__panel--neutral">
      <span class="ai-status__badge">{{ TEXT.abortedBadge }}</span>
      <div class="ai-status__footer">
        <a-button type="primary" size="small" @click="emit('resume')">
          {{ TEXT.resume }}
        </a-button>
        <a-button type="secondary" size="small" @click="emit('regenerate')">
          {{ TEXT.regenerate }}
        </a-button>
      </div>
    </div>

    <!-- 异常态（网络超时 / 模型超时 / 失败）：error 色容器 + 对应后续动作；文案只读 errorReason，不暴露堆栈/错误码 -->
    <div v-else class="ai-status__panel ai-status__panel--error">
      <span class="ai-status__error-text">{{ label }}</span>
      <div class="ai-status__footer">
        <a-button type="primary" size="small" @click="onErrorAction">
          {{ errorActionText }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAiStore } from '@core/ai/store'
import AiActiveContainer from './AiActiveContainer.vue'
import AiThinkingDots from './AiThinkingDots.vue'
import AiStreamCursor from './AiStreamCursor.vue'
import AiPingWave from './AiPingWave.vue'
import AiTag from './AiTag.vue'

/**
 * AI 状态可视化总控（实施方案任务 4.12 / 规范 §02.2 原则四：生成/任务/异常三链路完整可感知）。
 *
 * 读 ai store 的 status(12 态)/execProgress/activeTool/errorReason，按映射表渲染每一种状态。
 * 【展示层，不持有状态、不触发执行】：停止/取消/重试/继续等待/重新生成一律 emit 交父级，
 * 执行仍走三步链 confirmExecute。中断 ≠ 失败（aborted 中性「已停止」，禁止红色）；
 * 三类超时文案与后续动作严格区分（网络→检查网络后重试 / 服务器→继续等待不重试 / 模型→稍后重试）。
 */
const emit = defineEmits<{
  (e: 'stop'): void
  (e: 'cancel'): void
  (e: 'retry'): void
  (e: 'resume'): void
  (e: 'regenerate'): void
  (e: 'keepWaiting'): void
}>()

// 状态文案集中定义，便于统一调整（规范文案：主动句、区分三类超时）
const TEXT = {
  requesting: '正在连接…',
  thinking: '运小星正在分析…',
  streaming: '正在生成回复…',
  executing: '正在执行…',
  timeoutServer: '服务响应较慢，AI 仍在处理',
  timeoutNetwork: '网络连接异常',
  timeoutModel: 'AI 响应超时，请稍后重试',
  failedFallback: 'AI 处理失败，请稍后重试',
  abortedBadge: '已停止',
  suggestionBadge: 'AI 建议',
  stop: '停止',
  cancel: '取消',
  resume: '继续',
  regenerate: '重新生成',
  retryNetwork: '检查网络后重试',
  keepWaiting: '继续等待',
}

const aiStore = useAiStore()
const { status, execProgress, activeTool, errorReason } = storeToRefs(aiStore)

// idle 与 awaitingUser 均不渲染（前者无状态，后者由 AiActionBar 承载）
const visible = computed(() => status.value !== 'idle' && status.value !== 'awaitingUser')

// 这几态统一用「进行态容器」承载；仅 requesting 不加流光（尚未进入 AI 处理）
const useActiveContainer = computed(() =>
  ['requesting', 'thinking', 'streaming', 'executing', 'timeoutServer'].includes(status.value),
)
const flowing = computed(() =>
  ['thinking', 'streaming', 'executing', 'timeoutServer'].includes(status.value),
)
// 三点脉冲：思考中 + 服务器超时（沿用思考中活跃态）
const showDots = computed(() => status.value === 'thinking' || status.value === 'timeoutServer')

// 右上角锚点动作：requesting→取消，thinking/streaming/executing→停止；timeoutServer 走底部按钮故为空
const topAction = computed<'stop' | 'cancel' | null>(() => {
  if (status.value === 'requesting') return 'cancel'
  if (['thinking', 'streaming', 'executing'].includes(status.value)) return 'stop'
  return null
})
const topActionText = computed(() => (topAction.value === 'cancel' ? TEXT.cancel : TEXT.stop))
function onTopAction(): void {
  if (topAction.value === 'cancel') emit('cancel')
  else if (topAction.value === 'stop') emit('stop')
}

// 异常态底部动作：网络超时→检查网络后重试(retry)；模型超时/失败→重新生成(regenerate)
const errorActionText = computed(() =>
  status.value === 'timeoutNetwork' ? TEXT.retryNetwork : TEXT.regenerate,
)
function onErrorAction(): void {
  if (status.value === 'timeoutNetwork') emit('retry')
  else emit('regenerate')
}

// 主文案：执行中读 execProgress（如「正在查询运单…第 2/3 步」）→ activeTool 兜底；失败读 errorReason
const label = computed(() => {
  switch (status.value) {
    case 'requesting':
      return TEXT.requesting
    case 'thinking':
      return TEXT.thinking
    case 'streaming':
      return TEXT.streaming
    case 'executing':
      return execProgress.value || activeTool.value || TEXT.executing
    case 'timeoutServer':
      return TEXT.timeoutServer
    case 'timeoutNetwork':
      return TEXT.timeoutNetwork
    case 'timeoutModel':
      return TEXT.timeoutModel
    case 'failed':
      return errorReason.value || TEXT.failedFallback
    default:
      return ''
  }
})
import { Button as AButton } from '@arco-design/web-vue'
</script>

<style scoped>
.ai-status__row {
  /* Positioning */
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-status__label {
  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.ai-status__footer {
  /* Positioning */
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);

  /* Box Model */
  margin-top: var(--spacing-sm);
}

.ai-status__anchor-btn {
  /* Typographic */
  color: var(--color-text-secondary);
}

.ai-status__panel {
  /* Box Model */
  padding: var(--spacing-md);
  border-radius: var(--border-radius-card);
}

/* 中断态：中性底 + 默认描边，绝不用 error 红 */
.ai-status__panel--neutral {
  /* Box Model */
  border: 1px solid var(--color-border);

  /* Visual */
  background: var(--color-bg-surface);
}

/* 异常态：error 浅底 + error 描边 */
.ai-status__panel--error {
  /* Box Model */
  border: 1px solid var(--color-error);

  /* Visual */
  background: var(--color-error-bg);
}

/* 「已停止」中性角标：白底默认描边、次要灰字，区别于 error 红 */
.ai-status__badge {
  /* Positioning */
  display: inline-flex;
  align-items: center;

  /* Box Model */
  height: 22px;
  padding: 0 var(--spacing-sm);
  border: 1px solid var(--color-border);

  /* Typographic */
  font-size: var(--font-size-xs);
  line-height: 1;
  color: var(--color-text-secondary);

  /* Visual */
  background: var(--color-bg-card);
  border-radius: var(--border-radius-default);
}

.ai-status__error-text {
  /* Typographic */
  font-size: var(--font-size-sm);
  color: var(--color-error);
}
</style>
