<template>
  <span class="ai-ping-wave" role="img" :aria-label="ariaLabel">
    <span class="ai-ping-wave__ring" />
    <span class="ai-ping-wave__ring" />
    <span class="ai-ping-wave__core" />
  </span>
</template>

<script setup lang="ts">
/**
 * AI 请求中信号波纹（实施方案任务 4.12 / 规范 §02.2 原则四「灰色信号波纹 Ping」）。
 *
 * 中性灰同心圆向外扩散（Ping），标记「建立连接 / 排队，尚未进入 AI 处理」。
 * 刻意用中性灰、【不含流光 / 紫色】，与「思考中」的蓝紫流光活跃态区分——
 * 流光只属于思考 / 生成 / 执行。周期走 --duration-ai-ping，纯展示不持有状态。
 */
interface Props {
  /** 无障碍标签，供屏幕阅读器播报正在建立连接 */
  ariaLabel?: string
}

withDefaults(defineProps<Props>(), {
  ariaLabel: '正在连接',
})
</script>

<style scoped>
.ai-ping-wave {
  /* Positioning */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* Box Model */
  width: 16px;
  height: 16px;
}

/* 实心核：中性次要灰，标记信号源 */
.ai-ping-wave__core {
  /* Box Model */
  width: 6px;
  height: 6px;

  /* Visual */
  background: var(--color-text-secondary);
  border-radius: 50%;
}

/* 扩散环：从核心向外放大并淡出，中性灰、无流光 */
.ai-ping-wave__ring {
  /* Positioning */
  position: absolute;
  top: 0;
  left: 0;

  /* Box Model */
  width: 100%;
  height: 100%;

  /* Visual */
  background: var(--color-text-secondary);
  border-radius: 50%;
  opacity: 0.4;

  /* Misc */
  animation-name: ai-ping-expand;
  animation-duration: var(--duration-ai-ping);
  animation-timing-function: var(--ease-ai-ping);
  animation-iteration-count: infinite;
}

/* 第二环延后半周期，形成连续外扩的信号波 */
.ai-ping-wave__ring:nth-child(2) {
  /* Misc */
  animation-delay: calc(var(--duration-ai-ping) / 2);
}

@keyframes ai-ping-expand {
  0% {
    opacity: 0.4;

    transform: scale(0.4);
  }

  100% {
    opacity: 0;

    transform: scale(1);
  }
}

/* 尊重降低动态偏好：仅留中性核心，停止外扩（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .ai-ping-wave__ring {
    /* Misc */
    animation: none;
    opacity: 0;
  }
}
</style>
