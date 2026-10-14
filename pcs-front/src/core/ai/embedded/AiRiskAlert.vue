<template>
  <div class="ai-risk-alert" :class="{ 'ai-risk-alert--high': level === 'high' }" role="alert">
    <span class="ai-risk-alert__accent" aria-hidden="true" />
    <SvgIcon name="ai-sparkle" class="ai-risk-alert__icon" />

    <div class="ai-risk-alert__body">
      <div class="ai-risk-alert__head">
        <AiTag :text="TEXT.riskTag" size="small" />
        <span v-if="title" class="ai-risk-alert__title">{{ title }}</span>
      </div>

      <p v-if="description" class="ai-risk-alert__desc">{{ description }}</p>
      <!-- 风险依据文案（AI 非黑盒）：如「基于近 30 天 128 条运单」 -->
      <p v-if="evidence" class="ai-risk-alert__evidence">{{ evidence }}</p>

      <!-- 操作区：按钮仅 emit，写操作仍走 AiActionBar 的确认→执行链，禁止在此短路执行 -->
      <div v-if="$slots.actions" class="ai-risk-alert__actions">
        <slot name="actions" />
      </div>
    </div>

    <a-button
      v-if="closable"
      class="ai-risk-alert__close"
      type="text"
      size="mini"
      @click="emit('close')"
    >
      <template #icon><icon-close /></template>
    </a-button>
  </div>
</template>

<script setup lang="ts">
import AiTag from '@core/ai/components/AiTag.vue'
import SvgIcon from '@core/components/base/SvgIcon.vue'

/**
 * 嵌入式 AI · 风险提示条（实施方案任务 4.8A / 规范 §02.2 原则五、§05 提示条、§5.10）。
 *
 * 承载「AI 给出的风险判断」（如运单延误、批量影响面），用【警告色提示条 + AiTag「AI 风险提示」】
 * 呈现，与系统 error 表单校验（红色）、AI 洞察卡（浅蓝紫渐变底）明确区分。
 * 红线：level=high 仍用警告色系，不误用 error 红；操作按钮只 emit 事件，
 * 写操作交给 AiActionBar 的确认→执行链，禁止在提示条内短路执行。
 */
interface Props {
  /** 风险级别：high 强调更重，但仍用警告色系，不与 error 校验混淆 */
  level?: 'warning' | 'high'
  title?: string
  description?: string
  /** 风险依据文案，如「基于近 30 天 128 条运单」 */
  evidence?: string
  /** 是否可关闭 */
  closable?: boolean
}

withDefaults(defineProps<Props>(), {
  level: 'warning',
  title: '',
  description: '',
  evidence: '',
  closable: false,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const TEXT = {
  riskTag: 'AI 风险提示',
}
import { Button as AButton } from '@arco-design/web-vue'
import { IconClose } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.ai-risk-alert {
  position: relative;

  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);

  padding: var(--spacing-sm) var(--spacing-md);
  padding-left: var(--spacing-md);
  overflow: hidden;

  color: var(--color-text-body);

  background: var(--color-warning-bg);
  border-radius: var(--border-radius-default);
}

/* 左侧 4px 警告色强调条 */
.ai-risk-alert__accent {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;

  width: 4px;

  background: var(--color-warning);
}

/* high：强调条加宽，强化「更需谨慎」，仍是警告色系 */
.ai-risk-alert--high .ai-risk-alert__accent {
  width: 6px;
}

.ai-risk-alert__icon {
  flex-shrink: 0;

  width: var(--icon-size-action);
  height: var(--icon-size-action);

  color: var(--color-warning);
}

.ai-risk-alert__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.ai-risk-alert__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-risk-alert__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.ai-risk-alert--high .ai-risk-alert__title {
  color: var(--color-warning);
}

.ai-risk-alert__desc {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.ai-risk-alert__evidence {
  margin: 0;

  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.ai-risk-alert__actions {
  display: flex;
  gap: var(--spacing-sm);

  margin-top: var(--spacing-xs);
}

.ai-risk-alert__close {
  flex-shrink: 0;

  color: var(--color-text-secondary);
}
</style>
