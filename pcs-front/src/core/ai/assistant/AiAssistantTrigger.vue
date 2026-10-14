<template>
  <!-- 悬浮球常驻（全局唯一 AI 入口）：面板打开时整体左移到面板左侧、箭头夹在球与面板之间（任务 4.11 集成规格） -->
  <div class="ai-trigger" :class="{ 'ai-trigger--open': isOpen }">
    <!-- 头像即点击区（§11.2）；用 button 承载键盘可达 -->
    <button
      type="button"
      class="ai-trigger__hit"
      :aria-label="TEXT.ariaLabel"
      :aria-expanded="isOpen"
      @click="onToggle"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
    >
      <!-- 头像纯装饰：无障碍名由 button aria-label 承载，避免屏幕阅读器重复播报 -->
      <span class="ai-trigger__ring" aria-hidden="true">
        <span class="ai-trigger__face">
          <AiAvatar size="md" alt="" />
        </span>
      </span>

      <!-- 未读：有数量→角标（>99 显 99+），有未读无数量→红点，无未读→不显 -->
      <span v-if="showCountBadge" class="ai-trigger__badge">{{ badgeText }}</span>
      <span v-else-if="showDot" class="ai-trigger__dot" aria-hidden="true" />

      <!-- 展开态：箭头夹在头像与面板之间，指向右侧面板 -->
      <icon-caret-right v-if="isOpen" class="ai-trigger__arrow" :size="16" />
    </button>

    <!-- 气泡提示：收起未 hover 显每日首次提示，展开 hover 显收起提示 -->
    <transition name="ai-trigger-bubble">
      <span v-if="bubbleText" class="ai-trigger__bubble" role="tooltip">
        {{ bubbleText }}
      </span>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconCaretRight } from '@arco-design/web-vue/es/icon/index.js'
import { useAiStore } from '@core/ai/store'
import { useDailyTip } from '@core/composables/useDailyTip'
import AiAvatar from '@core/ai/components/AiAvatar.vue'

/**
 * 运小星 · 悬浮入口（实施方案任务 4.9 / 规范 §11.2 悬浮入口、§3.9 z-index）。
 *
 * 固定右下角的品牌悬浮球：白底吉祥物头像 + 蓝紫渐变外描边（描边才是渐变，勿把整球做成紫色），
 * 点击切换 ai store 的 assistantOpen 开合对话面板。z-index 走 --z-ai-entry(800)，
 * 高于内容、低于 Drawer/Modal/全局 loading。
 *
 * 全局唯一入口，面板打开时不隐藏而是整体左移贴到面板左侧（transform 与面板滑入联动），
 * 箭头夹在头像与面板之间指向面板；Mobile 全屏弹层态下球被 z-900 面板覆盖，无需位移。
 *
 * 未读角标三态用 prop 驱动（组件自洽，不越权改 store）：
 *   unreadCount>0 → 数量角标（>99 显 99+）；unreadCount=0 且 unreadDot → 红点；否则不显。
 *
 * 「有问题？找运小星！」每日首次点击后消失，跨天自动重现，逻辑封装在 useDailyTip。
 */
interface Props {
  /** 未读数量；>0 时显数量角标，超 99 显「99+」。默认 0 不显角标 */
  unreadCount?: number
  /** 有未读但无具体数量时显 8px 红点；unreadCount>0 时以数量角标优先 */
  unreadDot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  unreadCount: 0,
  unreadDot: false,
})

const aiStore = useAiStore()

// 「每日首次」气泡：跨天重现，比对存储日期串而非布尔（详见 useDailyTip）
const DAILY_TIP_KEY = 'baiyun-ai-trigger-tip-dismissed'
const { visible: dailyTipVisible, dismiss: dismissDailyTip } = useDailyTip(DAILY_TIP_KEY)

// 气泡文案：任务 2.13A 的 copy.ts 尚未落地，暂以组件内局部 TEXT 承载，待 copy.ts 就绪迁移
const TEXT = {
  triggerTipCollapsed: '有问题？找运小星！',
  triggerTipExpanded: '点击可收起面板',
  overflowCount: '99+',
  ariaLabel: '运小星 AI 助手',
}

const hovering = ref(false)
const isOpen = computed(() => aiStore.assistantOpen)

const showCountBadge = computed(() => props.unreadCount > 0)
const showDot = computed(() => !showCountBadge.value && props.unreadDot)
const badgeText = computed(() =>
  props.unreadCount > 99 ? TEXT.overflowCount : String(props.unreadCount),
)

const bubbleText = computed(() => {
  if (!isOpen.value && dailyTipVisible.value) {
    return TEXT.triggerTipCollapsed
  }
  if (isOpen.value && hovering.value) return TEXT.triggerTipExpanded
  return ''
})

function onToggle(): void {
  // 首次点击即记为今日已提示并隐藏气泡（幂等，重复点击无副作用）
  dismissDailyTip()
  aiStore.toggleAssistant()
}
</script>

<style>
.ai-trigger {
  /* Positioning */
  position: fixed;
  right: var(--spacing-lg);
  bottom: 80px;
  z-index: var(--z-ai-entry);

  /* Misc - 打开态左移到贴边面板左侧，与面板滑入同款时长联动 */
  transition: right var(--duration-drawer-in) var(--ease-drawer-in);
}

/* 打开态：球贴面板左侧、腾出箭头间距。面板贴右，位移量 = 面板宽 + 箭头间距 */
.ai-trigger--open {
  /* Positioning */
  right: calc(var(--ai-panel-width) + var(--spacing-sm));
}

.ai-trigger__hit {
  /* Positioning */
  position: relative;
  display: inline-flex;

  /* Box Model */
  padding: 0;
  border: none;

  /* Visual */
  background: transparent;

  /* Misc */
  cursor: pointer;
}

/* 外层 1px 描边：固定透明占位，hover 仅改变颜色，避免头像尺寸抖动 */
.ai-trigger__ring {
  /* Positioning */
  position: relative;
  display: inline-flex;

  /* Box Model */
  padding: 1px;

  /* Visual */
  background: transparent;
  border-radius: 50%;
  box-shadow: var(--shadow-md);
}

/* 外层描边的渐变层：透明度过渡负责悬停显示动画 */
.ai-trigger__ring::before {
  /* Positioning */
  content: '';
  position: absolute;
  inset: 0;

  /* Visual */
  background: linear-gradient(135deg, var(--color-primary), var(--color-ai));
  border-radius: inherit;
  opacity: 0;

  /* Misc */
  transition: opacity var(--duration-state) var(--ease-state);
}

.ai-trigger__hit:hover .ai-trigger__ring::before {
  opacity: 1;
}

/* 头像本体固定 2px 蓝紫渐变边框，始终显示；AiAvatar 的 md 尺寸仍为 48px */
.ai-trigger__face {
  /* Positioning */
  position: relative;
  display: inline-flex;

  /* Box Model */
  padding: 2px;

  /* Visual */
  background: linear-gradient(135deg, var(--color-primary), var(--color-ai));
  border-radius: 50%;
}

/* 未读数量角标：最小 16×16，10px 白字，红底，双位数呈胶囊 */
.ai-trigger__badge {
  /* Positioning */
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Box Model */
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;

  /* Typographic */
  font-size: var(--font-size-tag-sm);
  line-height: 1;
  color: var(--color-text-on-overlay);

  /* Visual */
  background: var(--color-error);
  border-radius: 999px;
}

/* 未读红点：8px 纯红点，无数量 */
.ai-trigger__dot {
  /* Positioning */
  position: absolute;
  top: 0;
  right: 0;

  /* Box Model */
  width: 8px;
  height: 8px;

  /* Visual */
  background: var(--color-error);
  border-radius: 50%;
}

/* 展开态箭头：头像右侧 8px，夹在头像与面板之间指向面板 */
.ai-trigger__arrow {
  /* Positioning */
  position: absolute;
  top: 50%;
  left: 100%;

  /* Box Model */
  margin-left: var(--spacing-sm);

  /* Typographic */
  color: var(--color-primary-200);

  /* Misc */
  transform: translateY(-50%);
}

/* 气泡提示：悬浮球左侧展开（球贴右边缘，向左弹出）；深色样式对齐 Tooltip 组件（规范 §5.14） */
.ai-trigger__bubble {
  /* Positioning */
  position: absolute;
  top: 50%;
  right: 100%;

  /* Box Model */
  margin-right: var(--spacing-sm);
  padding: 6px 12px;

  /* Typographic */
  font-size: var(--font-size-xs);
  line-height: var(--line-height-xs);
  color: var(--color-text-on-overlay);
  white-space: nowrap;

  /* Visual */
  background: var(--color-tooltip-bg);
  border-radius: var(--border-radius-checkbox);
  box-shadow: var(--shadow-md);

  /* Misc */
  transform: translateY(-50%);
}

/* 尖角：对齐 Tooltip 箭头做法（placement=left）—— 同色 8px 方块旋转 45°，
   中心压在气泡右缘垂直居中，半探出指向右侧悬浮球；内角叠入气泡侧，与背景同色不可见，
   且小于 12px 内边距不会盖到文字 */
.ai-trigger__bubble::after {
  /* Positioning */
  content: '';
  position: absolute;
  top: 50%;
  right: 0;

  /* Box Model */
  width: var(--spacing-sm);
  height: var(--spacing-sm);

  /* Visual */
  background: var(--color-tooltip-bg);

  /* Misc */
  transform: translate(50%, -50%) rotate(45deg);
}

.ai-trigger-bubble-enter-active,
.ai-trigger-bubble-leave-active {
  transition: opacity var(--duration-state) var(--ease-state);
}

.ai-trigger-bubble-enter-from,
.ai-trigger-bubble-leave-to {
  opacity: 0;
}

/* Mobile：面板全屏（z-900）覆盖球，无左移语义，复位贴边位移 */
@media (width <= 767px) {
  .ai-trigger--open {
    /* Positioning */
    right: var(--spacing-lg);
  }
}
</style>
