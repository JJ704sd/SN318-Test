<template>
  <span class="ai-stream-cursor" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * AI 流式末尾光标（实施方案任务 4.12 / 规范 §02.2 原则四「末尾光标」、§11.4 对话气泡）。
 *
 * 生成中挂在流式文字末尾的 1px 竖线闪烁光标，跟随 AI 紫，纯装饰（aria-hidden）。
 * 周期走 --duration-cursor-blink；供对话气泡（MessageItem）与生成态容器统一复用，避免重复实现。
 */
</script>

<style scoped>
.ai-stream-cursor {
  /* Positioning */
  display: inline-block;
  vertical-align: text-bottom;

  /* Box Model */
  width: 2px;
  height: 1em;
  margin-left: 2px;

  /* Visual */
  background: var(--color-ai);

  /* Misc */
  animation-name: ai-stream-cursor-blink;
  animation-duration: var(--duration-cursor-blink);
  animation-timing-function: steps(2, start);
  animation-iteration-count: infinite;
}

@keyframes ai-stream-cursor-blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

/* 尊重降低动态偏好：保持常显不闪烁（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .ai-stream-cursor {
    /* Misc */
    animation: none;
  }
}
</style>
