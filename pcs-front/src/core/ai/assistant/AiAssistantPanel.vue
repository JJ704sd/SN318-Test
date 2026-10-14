<template>
  <Teleport to="body">
    <transition name="fade-drawer">
      <div
        v-if="assistantOpen"
        class="ai-panel__overlay"
        aria-hidden="true"
        @click="aiStore.toggleAssistant"
      />
    </transition>
    <transition name="ai-panel">
      <section
        v-if="assistantOpen"
        class="ai-panel"
        :class="{ 'ai-panel--mobile': isMobile }"
        role="dialog"
        :aria-label="TEXT.brand"
        :style="panelBgStyle"
      >
        <!-- 标题栏 48px 固定：✦ 运小星 + 关闭 -->
        <header class="ai-panel__head">
          <span class="ai-panel__brand">
            <SvgIcon name="ai-sparkle" class="ai-panel__brand-icon" />
            {{ TEXT.brand }}
          </span>
          <button
            class="ai-panel__close"
            type="button"
            :aria-label="TEXT.close"
            @click="aiStore.toggleAssistant"
          >
            <icon-close :size="16" />
          </button>
        </header>

        <!-- 对话历史区：撑满剩余、独立滚动、自动滚底 -->
        <MessageList :messages="messages" />

        <!-- 快捷追问区：空对话时给出引导追问，生成中禁用 -->
        <QuickAskBar :items="quickAsks" @ask="onQuickAsk" />

        <!-- 输入区：胶囊输入 + 圆形发送/停止切换（停止入口在输入区，不在气泡角落） -->
        <footer class="ai-panel__input">
          <div class="ai-panel__composer">
            <div class="ai-panel__field">
              <input
                ref="inputRef"
                v-model="draft"
                type="text"
                :placeholder="isBusy ? TEXT.replying : TEXT.placeholder"
                :disabled="isBusy"
                @keydown.enter="onSend"
              />
            </div>
            <a-button
              v-if="isBusy"
              class="ai-panel__action ai-panel__action--stop"
              shape="circle"
              :aria-label="TEXT.stop"
              @click="aiStore.abort"
            >
              <template #icon>
                <span class="ai-panel__stop-icon" />
              </template>
            </a-button>
            <a-button
              v-else
              class="ai-panel__action ai-panel__action--send"
              shape="circle"
              :aria-label="TEXT.send"
              @click="onSend"
            >
              <template #icon>
                <icon-arrow-up :size="16" />
              </template>
            </a-button>
          </div>
        </footer>
      </section>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAiStore, type AiStatus } from '@core/ai/store'
import { useDevice } from '@core/composables/useDevice'
import SvgIcon from '@core/components/base/SvgIcon.vue'
import MessageList from './_internals/MessageList.vue'
import QuickAskBar from './_internals/QuickAskBar.vue'
// 背景图为助手面板私有资源（S4-E/C2'）：js asset import 外链（assetsInlineLimit:0），
// 注入组件级私有 CSS 变量供 .ai-panel 引用；未加载本组件不触发该图片请求
import aiPanelBg from '../../assets/bg_ai.png'

/**
 * 运小星 · 对话浮层窗口（实施方案任务 4.10 / 规范 §11.1 浮层覆盖式、§11.3 浮层窗口、§11.5 响应式）。
 *
 * 浮层覆盖式独立组件（不复用 ByDrawer/a-drawer）：position:fixed 浮于内容之上、不挤压内容区。
 * Desktop 400px / Tablet 360px / Mobile 全屏弹层。高度公式引用响应式 --layout-header-height。
 * 显隐由 store.assistantOpen 驱动（滑入 250ms ease-out / 滑出 200ms ease-in）。
 * 发送 / 停止在输入区切换（规范 §02.2 原则四：停止入口放输入区，不放气泡角落）。
 */
const TEXT = {
  brand: '运小星',
  close: '关闭',
  placeholder: '请描述你的问题',
  replying: 'AI 正在回复...',
  send: '发送',
  stop: '停止',
}

type PreviewableAiStatus = Exclude<AiStatus, 'idle'>

const STATUS_PREVIEW_PREFIX = 'status-preview:'
const STATUS_PREVIEW_ITEMS: Array<{ label: string; status: PreviewableAiStatus }> = [
  { label: '请求中', status: 'requesting' },
  { label: '思考中', status: 'thinking' },
  { label: '生成中', status: 'streaming' },
  { label: '完成', status: 'done' },
  { label: '执行中', status: 'executing' },
  { label: '等待确认', status: 'awaitingUser' },
  { label: '已停止', status: 'aborted' },
  { label: '网络超时', status: 'timeoutNetwork' },
  { label: '服务器超时', status: 'timeoutServer' },
  { label: '模型超时', status: 'timeoutModel' },
  { label: '失败', status: 'failed' },
]
const STATUS_PREVIEW_MAP = new Map(
  STATUS_PREVIEW_ITEMS.map((item) => [`${STATUS_PREVIEW_PREFIX}${item.status}`, item.status]),
)
const BUSINESS_QUICK_ASKS = [
  '帮我查询运单状态',
  '生成本月运单报表',
  '有哪些待处理的异常？',
]

// 面板私有背景变量：值随组件打包资源注入，避免全局 token 携带 AI 图片（S4-E/C2'）
const panelBgStyle = computed(() => ({
  '--ai-panel-bg-image': `url("${aiPanelBg}")`,
}))

const aiStore = useAiStore()
const { assistantOpen, messages, status } = storeToRefs(aiStore)
const { isMobile } = useDevice()

const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const previewingStatus = ref(false)

const PAGE_SCROLL_LOCK_CLASS = 'ai-assistant-open'

function setPageScrollLocked(locked: boolean): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle(PAGE_SCROLL_LOCK_CLASS, locked)
  document.body.classList.toggle(PAGE_SCROLL_LOCK_CLASS, locked)
}

watch(assistantOpen, setPageScrollLocked, { flush: 'sync', immediate: true })

onBeforeUnmount(() => setPageScrollLocked(false))

watch(
  assistantOpen,
  (open) => {
    if (!open) return
    void nextTick(() => inputRef.value?.focus())
  },
  { flush: 'post', immediate: true },
)

// 生成 / 执行进行中：输入禁用、发送切停止（衔接 4.5 状态机）
const isBusy = computed(() =>
  ['requesting', 'thinking', 'streaming', 'executing'].includes(status.value),
)

const quickAsks = computed(() => [
  ...STATUS_PREVIEW_ITEMS.map((item) => ({
    label: item.label,
    value: `${STATUS_PREVIEW_PREFIX}${item.status}`,
    disabled: isBusy.value && !previewingStatus.value,
  })),
  ...BUSINESS_QUICK_ASKS.map((text) => ({
    label: text,
    value: text,
    disabled: isBusy.value,
  })),
])

function onSend(): void {
  const text = draft.value.trim()
  if (!text || isBusy.value) return
  draft.value = ''
  void aiStore.sendMessage(text)
}

function onQuickAsk(text: string): void {
  const previewStatus = STATUS_PREVIEW_MAP.get(text)
  if (previewStatus) {
    previewingStatus.value = true
    aiStore.previewStatus(previewStatus)
    return
  }
  if (isBusy.value) return
  previewingStatus.value = false
  void aiStore.sendMessage(text)
}
import { Button as AButton } from '@arco-design/web-vue'
import { IconArrowUp, IconClose } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style>
/* 对话框打开时锁定页面根滚动；面板内部消息区仍由自身 overflow-y: auto 滚动。 */
html.ai-assistant-open,
body.ai-assistant-open {
  overflow: hidden;
}

.ai-panel {
  /* Positioning */
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-ai-panel);
  display: flex;
  flex-direction: column;

  /* Box Model */
  width: var(--ai-panel-width);
  border-left: var(--border-default);

  /* Visual */
  background-color: var(--color-bg-page);

  /* 背景变量为本组件私有（S4-E/C2'）：值由 script 资产 import 注入，未加载助手不请求图片 */
  background-image: var(--ai-panel-bg-image);
  background-repeat: no-repeat;
  background-position: center top;
  background-size: 100% auto;
  box-shadow: var(--shadow-drawer);

  /* Misc */
  overflow: hidden;
}

/* 页面遮罩：阻断背景交互；低于悬浮入口与面板，避免遮住可见的关闭路径。 */
.ai-panel__overlay {
  /* Positioning */
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-ai-entry) - 1);

  /* Visual */
  background-color: var(--overlay-modal);
}

/* 标题栏 48px 固定 */
.ai-panel__head {
  /* Positioning */
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;

  /* Box Model */
  height: 48px;
  padding: 0 var(--spacing-md);
}

/* 关闭按钮：默认使用标题黑色，悬停补齐浅灰底色 */
.ai-panel__close {
  /* Positioning */
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;

  /* Box Model */
  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: var(--border-radius-default);

  /* Typographic */
  color: var(--color-text-title);

  /* Visual */
  background: transparent;
  cursor: pointer;

  /* Misc */
  transition: background-color var(--duration-state) var(--ease-state),
    color var(--duration-state) var(--ease-state);
}

.ai-panel__close:hover {
  /* Typographic */
  color: var(--color-primary);

  /* Visual */
  background-color: var(--color-bg-surface);
}

.ai-panel__close:focus-visible {
  /* Typographic */
  color: var(--color-text-title);

  /* Visual */
  background-color: var(--color-bg-surface);
}

.ai-panel__brand {
  /* Positioning */
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);

  /* Typographic */
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.ai-panel__brand-icon {
  width: var(--icon-size-inline);
  height: var(--icon-size-inline);

  color: var(--color-ai);
}

/* 消息区与快捷追问区均使用轻量原生滚动条，避免占据对话面板的有效空间。 */
.ai-panel .msg-list,
.ai-panel .quick-ask {
  /* Visual */
  scrollbar-color: var(--color-text-secondary) transparent;

  /* Misc */
  scrollbar-width: thin;
}

.ai-panel .msg-list::-webkit-scrollbar,
.ai-panel .quick-ask::-webkit-scrollbar {
  /* Box Model */
  width: var(--spacing-xs);
  height: var(--spacing-xs);
}

.ai-panel .msg-list::-webkit-scrollbar-button,
.ai-panel .quick-ask::-webkit-scrollbar-button {
  /* Positioning */
  display: none;
}

.ai-panel .msg-list::-webkit-scrollbar-track,
.ai-panel .quick-ask::-webkit-scrollbar-track {
  /* Visual */
  background-color: transparent;
}

.ai-panel .msg-list::-webkit-scrollbar-thumb,
.ai-panel .quick-ask::-webkit-scrollbar-thumb {
  /* Visual */
  background-color: var(--color-text-secondary);
  border-radius: var(--border-radius-default);
}

.ai-panel .msg-list::-webkit-scrollbar-thumb:hover,
.ai-panel .quick-ask::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-body);
}

/* 输入区：白底承载胶囊输入 + 圆形动作按钮 */
.ai-panel__input {
  /* Positioning */
  display: flex;
  flex-shrink: 0;

  /* Box Model */
  padding: var(--spacing-md);

  /* Visual */
  background-color: var(--color-bg-card);
}

.ai-panel__composer {
  /* Positioning */
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--spacing-sm);

  /* Box Model */
  min-width: 0;

  /* Visual */
  background-color: var(--color-bg-card);
  border-radius: var(--border-radius-card);
}

.ai-panel__field {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  height: var(--size-icon-btn);
  padding: 0 var(--spacing-md);
  background-color: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--border-radius-default);
  box-shadow: none;
}

.ai-panel__field:focus-within {
  border: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.ai-panel__field input,
.ai-panel__field input:disabled {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: none;
  outline: none;
  background-color: transparent;
  color: var(--color-text-body);
  font-family: inherit;
  font-size: inherit;

  /* 行高等于控件高，再上移 1px 抵消 CJK/Inter 字形视觉偏下 */
  line-height: var(--size-icon-btn);
  transform: translateY(-1px);
  appearance: none;
  cursor: inherit;
}

.ai-panel__field input::placeholder {
  color: var(--color-text-placeholder);
}

/* 选择器需压过 arco-theme「medium 非 only-icon min-width:80 / padding 0 16」 */
.ai-panel__composer .ai-panel__action.arco-btn.arco-btn-size-medium {
  /* Positioning */
  display: inline-flex;
  flex: 0 0 var(--size-icon-btn);
  align-items: center;
  justify-content: center;

  /* Box Model */
  width: var(--size-icon-btn);
  height: var(--size-icon-btn);
  min-width: var(--size-icon-btn);
  max-width: var(--size-icon-btn);
  padding: 0;
  border: none;

  /* Typographic */
  font-size: var(--icon-size-inline);
  color: var(--color-text-on-overlay);

  /* Visual */
  border-radius: 50%;
}

.ai-panel__action--send.arco-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-ai));
}

.ai-panel__action--send.arco-btn:not(.arco-btn-disabled):hover,
.ai-panel__action--send.arco-btn:not(.arco-btn-disabled):focus {
  background: linear-gradient(135deg, var(--color-primary-hover), var(--color-ai));
  color: var(--color-text-on-overlay);
}

.ai-panel__action--send.arco-btn.arco-btn-disabled {
  background: var(--color-bg-disabled);
  color: var(--color-text-secondary);
}

.ai-panel__composer .ai-panel__action--stop.arco-btn,
.ai-panel__composer .ai-panel__action--stop.arco-btn[type='button'] {
  background-color: var(--color-bg-page);
  color: var(--color-text-body);
}

.ai-panel__composer .ai-panel__action--stop.arco-btn:hover,
.ai-panel__composer .ai-panel__action--stop.arco-btn:focus {
  background-color: var(--color-bg-active);
  color: var(--color-text-body);
}

.ai-panel__stop-icon {
  display: block;
  width: var(--spacing-sm);
  height: var(--spacing-sm);
  background-color: var(--color-text-body);
}

/* Tablet 收窄至 360px 由 --ai-panel-width（tokens.css 媒体查询）统一驱动，此处不再重复覆盖 */

/* Mobile：全屏弹层，不用浮层宽度（§11.5 / §05 弹窗 Mobile 全屏） */
.ai-panel--mobile {
  inset: 0;

  width: 100%;
  height: 100%;
  border-left: none;
  border-radius: 0;
}

/* 展开滑入 250ms ease-out / 收起滑出 200ms ease-in（§11.3） */
.ai-panel-enter-active {
  transition:
    transform var(--duration-drawer-in) var(--ease-drawer-in),
    opacity var(--duration-drawer-in) var(--ease-drawer-in);
}

.ai-panel-leave-active {
  transition:
    transform var(--duration-drawer-out) var(--ease-drawer-out),
    opacity var(--duration-drawer-out) var(--ease-drawer-out);
}

.ai-panel-enter-from,
.ai-panel-leave-to {
  transform: translateX(100%);

  opacity: 0;
}
</style>
