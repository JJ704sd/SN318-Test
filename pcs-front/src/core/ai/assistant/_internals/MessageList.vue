<template>
  <div ref="scrollEl" class="msg-list">
    <!-- 欢迎语作为运小星的首条消息，始终与后续对话复用同一气泡组件。 -->
    <MessageItem
      v-for="msg in visibleMessages"
      :key="msg.id"
      :message="msg"
      :suggestion="chatSuggestions[msg.id]"
      @accept-suggestion="aiStore.acceptChatSuggestion"
      @ignore-suggestion="aiStore.ignoreChatSuggestion"
    />
    <!-- 除流式输出外，工作态与异常态均按对话式状态消息呈现。 -->
    <ChatStatusMessage
      v-if="chatStatus"
      :status="chatStatus"
      :partial-content="lastAssistantContent"
      :error-reason="errorReason"
      :exec-progress="execProgress"
      :active-tool="activeTool"
      @stop="aiStore.abort"
      @resume="regenerateLastQuestion"
      @regenerate="regenerateLastQuestion"
      @retry="regenerateLastQuestion"
      @keep-waiting="aiStore.continueWaiting"
    />
    <!-- AI 回复含可执行动作时，在最新气泡下方嵌入动作条走「确认后执行」（不另开弹窗） -->
    <AiActionBar v-if="showPendingAction" chat class="msg-list__action" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAiStore } from '@core/ai/store'
import MessageItem from './MessageItem.vue'
import ChatStatusMessage from './ChatStatusMessage.vue'
import AiActionBar from '@core/ai/components/AiActionBar.vue'
import type { AiMessage } from '@core/ai/service/types'
import type { AiStatus } from '@core/ai/store'

/**
 * 运小星 · 对话历史区（实施方案任务 4.10 / 规范 §11.3 浮层窗口结构）。
 *
 * 撑满剩余空间、独立滚动，新消息 / 流式增量自动滚到底部。
 * 含可执行动作时在末尾嵌入 AiActionBar（其自身读 store.pendingAction，走确认→执行链）。
 */
interface Props {
  messages: AiMessage[]
}

const props = defineProps<Props>()

const greetingMessage: AiMessage = {
  id: 'ai-assistant-greeting',
  role: 'assistant',
  content: '你好，我是运小星 ✦ 你的物流小助手。\n可以问我运单状态、渠道时效、海外仓库存，也能帮你批量处理异常单。',
  createdAt: Date.now(),
}

const aiStore = useAiStore()
const { pendingAction, chatSuggestions, status, errorReason, execProgress, activeTool } =
  storeToRefs(aiStore)
const showPendingAction = computed(
  () => pendingAction.value !== null && status.value === 'awaitingUser',
)

const STATUS_MESSAGE_STATES = new Set<AiStatus>([
  'requesting',
  'thinking',
  'executing',
  'aborted',
  'timeoutNetwork',
  'timeoutServer',
  'timeoutModel',
  'failed',
])

type ChatStatus = Exclude<AiStatus, 'idle' | 'streaming' | 'done' | 'awaitingUser'>

const chatStatus = computed<ChatStatus | null>(() =>
  STATUS_MESSAGE_STATES.has(status.value) ? (status.value as ChatStatus) : null,
)
const lastMessage = computed(() => props.messages[props.messages.length - 1] ?? null)
const lastAssistantContent = computed(() =>
  lastMessage.value?.role === 'assistant' ? lastMessage.value.content : '',
)
const lastUserContent = computed(() => {
  for (let i = props.messages.length - 1; i >= 0; i -= 1) {
    const message = props.messages[i]
    if (message?.role === 'user') return message.content
  }
  return ''
})

// 状态消息会完整承接最新 assistant 占位消息，避免空白/部分文本被渲染两次。
const visibleMessages = computed(() => {
  const messages = [greetingMessage, ...props.messages]
  if (!chatStatus.value || lastMessage.value?.role !== 'assistant') return messages
  return messages.filter((message) => message.id !== lastMessage.value?.id)
})

function regenerateLastQuestion(): void {
  const content = lastUserContent.value.trim()
  if (content) void aiStore.sendMessage(content)
}

const scrollEl = ref<HTMLElement | null>(null)

function scrollToBottom(): void {
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}

// 对话面板关闭后会卸载消息区，再次打开时需在首次挂载后定位到最新消息。
onMounted(() => {
  void nextTick(scrollToBottom)
})

// 消息条数、流式增量、建议动作或授权卡出现均触发滚底
watch(
  () => [
    props.messages.length,
    props.messages[props.messages.length - 1]?.content,
    status.value,
    Object.keys(chatSuggestions.value).length,
    showPendingAction.value,
  ],
  () => {
    void nextTick(scrollToBottom)
  },
  { flush: 'post' },
)
</script>

<style scoped>
.msg-list {
  /* Positioning */
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: var(--spacing-md);

  /* Box Model */
  padding: var(--spacing-md);

  /* Misc */
  overflow-y: auto;
}

/* 确认卡与最新 AI 气泡同列，避开 32px 头像。 */
.msg-list__action {
  align-self: flex-start;

  width: calc(80% - var(--ai-avatar-size-sm) - var(--spacing-sm));
  margin-top: calc(var(--spacing-sm) * -1);
  margin-left: calc(var(--ai-avatar-size-sm) + var(--spacing-sm));
}
</style>
