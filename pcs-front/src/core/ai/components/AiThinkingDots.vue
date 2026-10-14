<template>
  <span class="ai-thinking-dots" role="img" :aria-label="ariaLabel">
    <span class="ai-thinking-dots__dot" />
    <span class="ai-thinking-dots__dot" />
    <span class="ai-thinking-dots__dot" />
  </span>
</template>

<script setup lang="ts">
/**
 * AI 思考中三点脉冲（实施方案任务 4.12 / 规范 §02.2 原则四「三点脉冲」）。
 *
 * 三个 AI 紫圆点保持固定尺寸，仅做错相位上跳 + 透明度脉冲，纯展示、不持有状态。
 * 供「思考中」与「服务器超时」（沿用思考中活跃态）复用；周期走 --duration-ai-pulse。
 */
interface Props {
  /** 无障碍标签，供屏幕阅读器播报当前 AI 处于思考态 */
  ariaLabel?: string
}

withDefaults(defineProps<Props>(), {
  ariaLabel: 'AI 正在思考',
})
</script>

<style scoped>
.ai-thinking-dots {
  /* Positioning */
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.ai-thinking-dots__dot {
  /* Box Model */
  width: 6px;
  height: 6px;

  /* Visual */
  background: var(--color-ai);
  border-radius: 50%;

  /* Misc */
  animation-name: pulse;
  animation-duration: var(--duration-ai-pulse);
  animation-timing-function: var(--ease-ai-pulse);
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

/* 错相位：后两点依次延后 1/3 周期，形成波浪脉冲 */
.ai-thinking-dots__dot:nth-child(2) {
  /* Misc */
  animation-delay: calc(var(--duration-ai-pulse) / 3);
}

.ai-thinking-dots__dot:nth-child(3) {
  /* Misc */
  animation-delay: calc(var(--duration-ai-pulse) / 3 * 2);
}

@keyframes pulse {
  0%,
  80%,
  100% {
    opacity: 0.35;

    transform: translateY(0);
  }

  40% {
    opacity: 1;

    transform: translateY(-3px);
  }
}

/* 尊重降低动态偏好：静止呈中等透明度，避免动画诱发不适（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .ai-thinking-dots__dot {
    /* Typographic */
    opacity: 0.6;

    /* Misc */
    animation: none;
  }
}
</style>
