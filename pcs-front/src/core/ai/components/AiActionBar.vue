<template>
  <div
    v-if="action"
    class="ai-action-bar"
    :class="{ 'ai-action-bar--danger': isHighRisk, 'ai-action-bar--chat': chat }"
  >
    <div v-if="!chat" class="ai-action-bar__head">
      <AiTag :text="TEXT.actionTag" size="small" />
      <span v-if="title" class="ai-action-bar__title">{{ title }}</span>
      <span v-if="isHighRisk" class="ai-action-bar__risk">{{ TEXT.highRisk }}</span>
    </div>

    <p class="ai-action-bar__desc">{{ chat ? TEXT.chatQuestion : action.description }}</p>

    <!-- 数据依据区：AI 非黑盒，执行前可展开理解推断来源；纯「读」，不触发任何执行 -->
    <div v-if="!chat && evidence.length > 0" class="ai-action-bar__evidence">
      <a-button
        class="ai-action-bar__evidence-toggle"
        type="text"
        size="mini"
        @click="evidenceOpen = !evidenceOpen"
      >
        <AiTag :text="TEXT.evidenceTag" size="small" />
        {{ evidenceOpen ? TEXT.evidenceHide : TEXT.evidenceShow }}
      </a-button>
      <ul v-if="evidenceOpen" class="ai-action-bar__evidence-list">
        <li v-for="(ev, i) in evidence" :key="i" class="ai-action-bar__evidence-item">
          <span class="ai-action-bar__evidence-label">{{ ev.label }}</span>
          <span class="ai-action-bar__evidence-value">{{ ev.value }}</span>
          <span v-if="ev.source" class="ai-action-bar__evidence-source">{{ ev.source }}</span>
        </li>
      </ul>
    </div>

    <div class="ai-action-bar__footer">
      <template v-if="chat">
        <a-button
          class="ai-action-bar__authorize"
          type="primary"
          size="small"
          :loading="executing"
          @click="onExecute"
        >
          <icon-check :size="14" />
          {{ TEXT.authorize }}
        </a-button>
        <a-button type="secondary" size="small" :disabled="executing" @click="onCancel">
          {{ TEXT.cancel }}
        </a-button>
      </template>
      <template v-else>
        <a-button type="secondary" size="small" :disabled="executing" @click="onCancel">
          {{ TEXT.cancel }}
        </a-button>
        <a-button type="primary" size="small" :loading="executing" @click="onExecute">
          {{ TEXT.execute }}
        </a-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAiStore } from '@core/ai/store'
import AiTag from '@core/ai/components/AiTag.vue'
import { confirmAction, successMsg } from '@core/components/feedback'

/**
 * 嵌入式 AI · 动作确认条（实施方案任务 4.8 / 规范 §02.2 原则三、§5.10 二次确认）。
 *
 * 就地内联承载 store.pendingAction 的「确认 → 执行」环节，禁止 FAB / 独立 AI 菜单（§10）。
 * 红线：本条【只负责确认后执行】，绝不短路三步链——proposeAction 已把动作置为待确认，
 * 此处点「执行」才调 confirmExecute；高风险动作先走 danger 二次确认。
 * evidence 依据区是「读」，展开查看不触发任何执行（AI 非黑盒、可解释）。
 */
interface Props {
  /** 对话浮层中的「等待用户」确认卡；嵌入式场景保持既有样式。 */
  chat?: boolean
}

withDefaults(defineProps<Props>(), {
  chat: false,
})

const TEXT = {
  actionTag: 'AI 操作',
  highRisk: '高风险',
  evidenceTag: 'AI 依据',
  evidenceShow: '查看依据',
  evidenceHide: '收起依据',
  execute: '执行',
  cancel: '取消',
  dangerTitle: '确认执行高风险操作',
  successMsg: '执行成功',
  chatQuestion: '执行前需要你确认，是否继续？',
  authorize: '授权并继续',
}

const aiStore = useAiStore()
const { pendingAction, pendingSuggestion, suggestions, status } = storeToRefs(aiStore)

const action = computed(() => pendingAction.value)

// 关联建议：优先取 proposeAction 随动作一并写入的 pendingSuggestion（对话式动作靠此拿到依据）；
// 回退到按引用相等在 suggestions 数组反查（嵌入式建议采纳路径，action 与某条 suggestion.action 同引用）。
const related = computed(
  () =>
    pendingSuggestion.value ??
    suggestions.value.find((s) => s.action === pendingAction.value) ??
    null,
)

const title = computed(() => related.value?.title ?? '')
const evidence = computed(() => related.value?.evidence ?? [])

// 高风险：建议标记 high，或动作自身要求二次确认
const isHighRisk = computed(
  () => related.value?.riskLevel === 'high' || action.value?.requireConfirm === true,
)

const executing = computed(() => status.value === 'executing')

const evidenceOpen = ref(false)

async function onExecute() {
  if (!action.value) return
  // 高风险动作：先弹 danger 二次确认，取消则中止，绝不直接执行
  if (isHighRisk.value) {
    const ok = await confirmAction({
      title: TEXT.dangerTitle,
      content: action.value.description,
      danger: true,
      okText: TEXT.execute,
    })
    if (!ok) return
  }
  await aiStore.confirmExecute()
  // confirmExecute 成功后会清空 pendingAction；据此判定成功再提示
  if (!aiStore.pendingAction && aiStore.status !== 'failed') {
    successMsg(TEXT.successMsg)
  }
}

function onCancel() {
  aiStore.cancelAction()
}
import { Button as AButton } from '@arco-design/web-vue'
import { IconCheck } from '@arco-design/web-vue/es/icon/index.js'
</script>

<style scoped>
.ai-action-bar {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);

  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-ai-light);
  border-radius: var(--border-radius-default);

  background: var(--color-bg-card);
}

/* 高风险：描边转 error 色，强化「需谨慎确认」信号（与 AiRiskAlert 的 warning 色系是两类不同语义，勿混用） */
.ai-action-bar--danger {
  border-color: var(--color-error);
}

.ai-action-bar__head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.ai-action-bar__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.ai-action-bar__risk {
  font-size: var(--font-size-xs);
  color: var(--color-error);
}

.ai-action-bar__desc {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.ai-action-bar__evidence-toggle {
  align-self: flex-start;

  color: var(--color-ai);
}

.ai-action-bar__evidence-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);

  margin: var(--spacing-xs) 0 0;
  padding: var(--spacing-sm) var(--spacing-md);

  list-style: none;

  background: var(--color-ai-light);
  border-radius: var(--border-radius-default);
}

.ai-action-bar__evidence-item {
  display: flex;
  gap: var(--spacing-sm);

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.ai-action-bar__evidence-label {
  color: var(--color-text-secondary);
}

.ai-action-bar__evidence-source {
  color: var(--color-text-secondary);
}

.ai-action-bar__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

/* 对话式等待用户：紧随 AI 气泡的浅紫确认卡，操作顺序为授权→取消。 */
.ai-action-bar--chat {
  gap: var(--spacing-xs);

  padding: var(--spacing-md);
  border-color: var(--color-ai);
  border-radius: var(--border-radius-card);

  background: var(--color-ai-light);
  box-shadow: none;
}

.ai-action-bar--chat .ai-action-bar__desc {
  margin: 0;
}

.ai-action-bar--chat .ai-action-bar__footer {
  justify-content: flex-start;
}

.ai-action-bar__authorize.arco-btn {
  border-color: transparent;
  background: linear-gradient(135deg, var(--color-primary), var(--color-ai));
  color: var(--color-text-on-overlay);
}

.ai-action-bar__authorize.arco-btn:not(.arco-btn-disabled):hover,
.ai-action-bar__authorize.arco-btn:not(.arco-btn-disabled):focus-visible {
  border-color: transparent;
  background: linear-gradient(135deg, var(--color-primary-hover), var(--color-ai));
  color: var(--color-text-on-overlay);
}
</style>
