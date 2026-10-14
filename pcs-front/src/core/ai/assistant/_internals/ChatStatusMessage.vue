<template>
  <div
    class="chat-status"
    :class="`chat-status--${status}`"
    role="status"
    aria-live="polite"
  >
    <AiAvatar size="sm" class="chat-status__avatar" />
    <div class="chat-status__content">
      <div v-if="status !== 'aborted'" class="chat-status__meta">
        <span class="chat-status__brand">
          <SvgIcon name="ai-sparkle" class="chat-status__brand-icon" />
          {{ TEXT.brand }}
        </span>
      </div>

      <!-- 请求中：中性灰波纹，尚未进入 AI 处理。 -->
      <div v-if="status === 'requesting'" class="chat-status__connection">
        <AiPingWave />
        <span>{{ TEXT.requesting }}</span>
      </div>

      <!-- 思考中：白色打字气泡 + AI 紫三点脉冲。 -->
      <div v-else-if="status === 'thinking'" class="chat-status__typing">
        <AiThinkingDots />
      </div>

      <!-- 执行中：清晰显示工具/步骤，并用蓝紫流光边框提示进行态。 -->
      <div v-else-if="status === 'executing'" class="chat-status__tool-step">
        <icon-tool :size="14" class="chat-status__tool-icon" />
        <span>{{ executionLabel }}</span>
      </div>

      <!-- 中断不是错误：保留断点文本并给出恢复动作。 -->
      <template v-else-if="status === 'aborted'">
        <span class="chat-status__stopped">{{ TEXT.aborted }}</span>
        <div class="chat-status__bubble">{{ partialContent || TEXT.abortedFallback }}</div>
        <div class="chat-status__actions">
          <a-button
            class="chat-status__primary-action"
            type="primary"
            size="small"
            @click="emit('resume')"
          >
            {{ TEXT.resume }}
          </a-button>
          <a-button type="secondary" size="small" @click="emit('regenerate')">
            <icon-refresh :size="14" />
            {{ TEXT.regenerate }}
          </a-button>
        </div>
      </template>

      <!-- 服务端超时仍为进行态：不作为错误、不提供重试。 -->
      <template v-else-if="status === 'timeoutServer'">
        <div class="chat-status__typing">
          <AiThinkingDots aria-label="AI 仍在处理" />
        </div>
        <p class="chat-status__hint">{{ TEXT.timeoutServer }}</p>
        <div class="chat-status__actions">
          <a-button
            class="chat-status__primary-action"
            type="primary"
            size="small"
            @click="emit('keepWaiting')"
          >
            {{ TEXT.keepWaiting }}
          </a-button>
          <a-button type="secondary" size="small" @click="emit('stop')">
            <span class="chat-status__stop-icon" aria-hidden="true" />
            {{ TEXT.stop }}
          </a-button>
        </div>
      </template>

      <!-- 网络、模型和未知失败均使用面向用户的错误气泡。 -->
      <template v-else>
        <div class="chat-status__bubble chat-status__bubble--error">{{ errorLabel }}</div>
        <div class="chat-status__actions">
          <a-button
            v-if="status === 'timeoutNetwork'"
            type="secondary"
            size="small"
            @click="emit('retry')"
          >
            <icon-refresh :size="14" />
            {{ TEXT.retryNetwork }}
          </a-button>
          <a-button v-else type="secondary" size="small" @click="emit('regenerate')">
            <icon-refresh :size="14" />
            {{ TEXT.regenerate }}
          </a-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AiAvatar from '@core/ai/components/AiAvatar.vue'
import AiPingWave from '@core/ai/components/AiPingWave.vue'
import AiThinkingDots from '@core/ai/components/AiThinkingDots.vue'
import SvgIcon from '@core/components/base/SvgIcon.vue'

type ChatStatus =
  | 'requesting'
  | 'thinking'
  | 'executing'
  | 'aborted'
  | 'timeoutNetwork'
  | 'timeoutServer'
  | 'timeoutModel'
  | 'failed'

interface Props {
  status: ChatStatus
  partialContent?: string
  errorReason?: string | null
  execProgress?: string | null
  activeTool?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  partialContent: '',
  errorReason: null,
  execProgress: null,
  activeTool: null,
})

const emit = defineEmits<{
  (e: 'stop'): void
  (e: 'resume'): void
  (e: 'regenerate'): void
  (e: 'retry'): void
  (e: 'keepWaiting'): void
}>()

const TEXT = {
  brand: '运小星',
  requesting: '正在建立连接…',
  executing: '正在执行任务…',
  aborted: '已停止',
  abortedFallback: '回复已停止生成。',
  resume: '继续',
  regenerate: '重新生成',
  timeoutServer: '服务响应较慢，AI 仍在处理，可继续等待',
  keepWaiting: '继续等待',
  stop: '停止',
  retryNetwork: '检查网络后重试',
  timeoutNetwork: '网络连接异常，请检查网络后重试。',
  timeoutModel: 'AI 响应超时，请稍后重试。',
  failed: 'AI 处理失败，请稍后重试。',
}

const executionLabel = computed(() => props.execProgress || props.activeTool || TEXT.executing)
const errorLabel = computed(() => {
  if (props.status === 'timeoutNetwork') return TEXT.timeoutNetwork
  if (props.status === 'timeoutModel') return TEXT.timeoutModel
  return props.errorReason || TEXT.failed
})
import { Button as AButton } from '@arco-design/web-vue'
import { IconRefresh, IconTool } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.chat-status {
  display: flex;
  align-self: flex-start;
  gap: var(--spacing-sm);
  max-width: 80%;
}

.chat-status__avatar {
  flex: 0 0 auto;
}

.chat-status__content {
  min-width: 0;
}

.chat-status__meta {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-xs);
}

.chat-status__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  color: var(--color-ai);
  font-size: var(--font-size-xs);
  line-height: 1;
}

.chat-status__brand-icon,
.chat-status__tool-icon {
  width: 14px;
  height: 14px;
}

.chat-status__connection {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.chat-status__typing,
.chat-status__bubble,
.chat-status__tool-step {
  box-shadow: none;
}

.chat-status__typing {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding: 0 var(--spacing-md);
  border: var(--border-default);
  background: var(--color-bg-card);
  border-radius: 0 var(--border-radius-card) var(--border-radius-card)
    var(--border-radius-card);
}

.chat-status__tool-step {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: 42px;
  padding: 0 var(--spacing-md);
  border: 2px solid transparent;
  border-radius: 0 var(--border-radius-card) var(--border-radius-card)
    var(--border-radius-card);
  background:
    linear-gradient(var(--color-bg-card), var(--color-bg-card)) padding-box,
    linear-gradient(
        110deg,
        rgb(4 110 252 / 34%),
        rgb(123 79 246 / 78%),
        rgb(83 226 232 / 58%),
        rgb(4 110 252 / 34%)
      )
      border-box;
  background-size:
    100% 100%,
    220% 100%;
  color: var(--color-text-body);
  font-size: var(--font-size-sm);
  animation-name: borderFlow;
  animation-duration: var(--duration-ai-execution-flow);
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.chat-status__tool-icon {
  flex: 0 0 auto;
  color: var(--color-ai);
}

.chat-status__stopped {
  display: inline-flex;
  align-items: center;
  height: 22px;
  margin-bottom: var(--spacing-xs);
  padding: 0 var(--spacing-sm);
  border-radius: var(--border-radius-default);
  background: var(--color-bg-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.chat-status__bubble {
  padding: var(--spacing-md);
  border: var(--border-default);
  border-radius: 0 var(--border-radius-card) var(--border-radius-card)
    var(--border-radius-card);
  background: var(--color-bg-card);
  color: var(--color-text-body);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-sm);
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.chat-status__bubble--error {
  background: var(--color-bg-card);
  box-shadow: none;
  color: var(--color-text-body);
}

.chat-status__hint {
  margin: var(--spacing-sm) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-sm);
}

.chat-status__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}

.chat-status__actions :deep(.arco-btn) {
  gap: var(--spacing-xs);
}

/* 停止生成：使用独立方形符号，避免 IconStop 的“禁止”语义。 */
.chat-status__stop-icon {
  width: 8px;
  height: 8px;
  border: 1.5px solid currentcolor;
  border-radius: 1px;
}

/* 图示中的进行/恢复主操作统一使用运小星蓝紫渐变。 */
.chat-status__primary-action.arco-btn {
  border-color: transparent;
  background: linear-gradient(135deg, var(--color-primary), var(--color-ai));
  color: var(--color-text-on-overlay);
}

.chat-status__primary-action.arco-btn:not(.arco-btn-disabled):hover,
.chat-status__primary-action.arco-btn:not(.arco-btn-disabled):focus-visible {
  border-color: transparent;
  background: linear-gradient(135deg, var(--color-primary-hover), var(--color-ai));
  color: var(--color-text-on-overlay);
}

/* stylelint-disable-next-line keyframes-name-pattern -- 按执行中流光规范固定使用 borderFlow。 */
@keyframes borderFlow {
  100% {
    background-position:
      0 0,
      220% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-status__tool-step {
    border-color: var(--color-ai);
    animation: none;
  }
}
</style>
