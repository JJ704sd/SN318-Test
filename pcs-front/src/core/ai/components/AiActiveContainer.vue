<template>
  <div class="ai-active-container" :class="{ 'ai-active-container--flow': flowing }">
    <!-- 右上角锚点固定的停止/取消插槽：绝对定位于容器右上角，不随流式内容跳动（规范 §02.2 原则四） -->
    <div v-if="$slots.action" class="ai-active-container__action">
      <slot name="action" />
    </div>

    <div class="ai-active-container__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * AI「进行时」容器（实施方案任务 4.12 / 规范 §02.2 原则四「蓝紫流光边框」）。
 *
 * flowing=true 时呈蓝→紫→青流光边框沿边流动，用于思考中/生成中/执行中/服务器超时等
 * AI 进行时状态；flowing=false 收敛为静态浅色容器，不持续抢注意力（规范：完成后收敛）。
 * 右上角 action 插槽承载停止/取消入口，锚点固定不随内容跳动。纯展示、不持有状态、不触发执行。
 */
interface Props {
  /** 是否处于进行态流光：true 显蓝紫青流光边框，false 收敛为静态浅色 */
  flowing?: boolean
}

withDefaults(defineProps<Props>(), {
  flowing: false,
})
</script>

<style scoped>
.ai-active-container {
  /* 组件内部三层堆叠顺序（局部作用域，非全局 z-index 体系）：流光边框 < 内容 < 锚点动作 */
  --layer-flow: 0;
  --layer-body: 1;
  --layer-action: 2;

  /* Positioning */
  position: relative;

  /* Box Model */
  padding: var(--spacing-md);
  border: 1px solid var(--color-ai-light);
  border-radius: var(--border-radius-card);

  /* Visual */
  background: var(--color-bg-card);
}

/*
 * 流光边框：伪元素铺满并外扩 1px 作边框层，用 --gradient-ai-flow（蓝→紫→青）大尺寸背景，
 * 通过 background-position 位移形成沿边流动错觉；mask 掏空中心只留边框环。
 */
.ai-active-container--flow {
  /* Visual */
  border-color: transparent;
}

.ai-active-container--flow::before {
  /* Positioning */
  content: '';
  position: absolute;
  inset: -1px;
  z-index: var(--layer-flow);

  /* Visual */
  background: var(--gradient-ai-flow);
  background-size: 300% 300%;
  border-radius: inherit;

  /* Misc */
  animation-name: ai-flow-move;
  animation-duration: var(--duration-ai-flow);
  animation-timing-function: linear;
  animation-iteration-count: infinite;

  /* 掏空中心：仅保留 1px 边框环（padding-box 填充色遮住内部，border-box 露出渐变） */
  padding: 1px;
  mask:
    linear-gradient(var(--color-bg-card) 0 0) content-box,
    linear-gradient(var(--color-bg-card) 0 0);
  mask-composite: exclude;
}

/* body 抬到流光伪元素之上，保证内容不被边框层遮挡 */
.ai-active-container__body {
  /* Positioning */
  position: relative;
  z-index: var(--layer-body);
}

/* 停止/取消锚点：固定右上角，不随流式内容跳动 */
.ai-active-container__action {
  /* Positioning */
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  z-index: var(--layer-action);
}

@keyframes ai-flow-move {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 300% 50%;
  }
}

/* 尊重降低动态偏好：移除流光伪元素、静止为 AI 紫描边（无障碍）。
   若仅 animation:none 会停在渐变起点（蓝色）造成误导，故整体隐藏 ::before 改用纯色边框 */
@media (prefers-reduced-motion: reduce) {
  .ai-active-container--flow {
    /* Visual */
    border-color: var(--color-ai);
  }

  .ai-active-container--flow::before {
    /* Positioning */
    display: none;
  }
}
</style>
