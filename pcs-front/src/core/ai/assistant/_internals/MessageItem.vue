<template>
  <div class="msg-item" :class="`msg-item--${message.role}`">
    <AiAvatar v-if="isAssistant" size="sm" class="msg-item__avatar" />

    <div class="msg-item__content">
      <!-- AI 品牌角标置于消息上方；用户仅在气泡上方显示时间。 -->
      <div v-if="isAssistant" class="msg-item__meta">
        <span class="msg-item__brand">
          <SvgIcon name="ai-sparkle" class="msg-item__brand-icon" />
          {{ TEXT.brand }}
        </span>
        <time class="msg-item__time" :datetime="timeDateTime">{{ displayTime }}</time>
      </div>
      <time v-else class="msg-item__time" :datetime="timeDateTime">{{ displayTime }}</time>

      <div class="msg-item__bubble">
        <span class="msg-item__text">{{ message.content }}</span>
        <!-- 流式末尾光标：仅 AI 消息流式输出中显示（规范 §11.4 / AI 生成态），复用 AiStreamCursor -->
        <AiStreamCursor v-if="isAssistant && message.streaming" class="msg-item__cursor" />
      </div>
      <ChatSuggestionActions
        v-if="isAssistant && suggestion?.action"
        class="msg-item__suggestion"
        @accept="emit('accept-suggestion', message.id)"
        @ignore="emit('ignore-suggestion', message.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AiAvatar from '@core/ai/components/AiAvatar.vue'
import SvgIcon from '@core/components/base/SvgIcon.vue'
import AiStreamCursor from '@core/ai/components/AiStreamCursor.vue'
import ChatSuggestionActions from './ChatSuggestionActions.vue'
import type { AiMessage, AiSuggestion } from '@core/ai/service/types'

/**
 * 运小星 · 单条对话气泡（实施方案任务 4.10 / 规范 §11.4 对话气泡组件）。
 *
 * 用户消息右对齐、蓝底白字、圆角 12（右上角 4）；
 * AI 消息左对齐、白底 body 字、左上直角且其余圆角 12，含头像及「✦ 运小星」紫色角标。
 * 两类气泡均为 12px 内边距、最大宽度为面板宽 80%，气泡上方显示发送时间。
 */
interface Props {
  message: AiMessage
  suggestion?: AiSuggestion
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'accept-suggestion', messageId: string): void
  (e: 'ignore-suggestion', messageId: string): void
}>()

const TEXT = {
  brand: '运小星',
}

const isAssistant = computed(() => props.message.role === 'assistant')
const timeDateTime = computed(() => new Date(props.message.createdAt).toISOString())
const displayTime = computed(() => {
  const date = new Date(props.message.createdAt)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
})
</script>

<style scoped>
.msg-item {
  /* Positioning */
  display: flex;
  gap: var(--spacing-sm);

  /* Box Model */
  max-width: 80%;
}

/* AI 左对齐、用户右对齐（§11.4） */
.msg-item--assistant {
  align-self: flex-start;
  align-items: flex-start;
}

.msg-item--user {
  align-self: flex-end;
  flex-direction: column;
  align-items: flex-end;
}

.msg-item__content {
  min-width: 0;
}

.msg-item--assistant .msg-item__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.msg-item__avatar {
  flex: 0 0 auto;
}

/* AI 品牌角标与时间：消息上方，品牌 12px 紫色。 */
.msg-item__meta {
  /* Positioning */
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);

  /* Box Model */
  margin-bottom: var(--spacing-xs);
}

.msg-item__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);

  font-size: var(--font-size-xs);
  line-height: 1;
  color: var(--color-ai);
}

.msg-item__brand-icon {
  width: 12px;
  height: 12px;
}

.msg-item__time {
  display: block;
  margin-bottom: var(--spacing-xs);

  font-size: var(--font-size-xs);
  line-height: 1;
  color: var(--color-text-secondary);
}

.msg-item--user .msg-item__time {
  width: 100%;
  text-align: right;
}

.msg-item__meta .msg-item__time {
  margin-bottom: 0;
}

.msg-item__bubble {
  /* Box Model */
  padding: 12px;
  border: var(--border-default);
  box-shadow: none;

  /* Typographic */
  font-size: var(--font-size-sm);
  line-height: var(--line-height-sm);
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

/* AI 气泡：白底、浅边框，左上直角贴合头像方向，其余保持 12px 圆角。 */
.msg-item--assistant .msg-item__bubble {
  color: var(--color-text-body);

  background: var(--color-bg-card);
  border-radius: 0 var(--border-radius-card) var(--border-radius-card)
    var(--border-radius-card);
}

/* 建议操作属于当前 AI 回复，紧贴气泡并随消息历史整体保留。 */
.msg-item__suggestion {
  margin-top: var(--spacing-sm);
}

/* 用户气泡：蓝底白字、圆角 12，右上角缩至 4px。 */
.msg-item--user .msg-item__bubble {
  border-color: var(--color-primary);
  color: var(--color-text-on-overlay);

  background: var(--color-primary);
  border-radius: var(--border-radius-card) var(--spacing-xs) var(--border-radius-card)
    var(--border-radius-card);
}
</style>
