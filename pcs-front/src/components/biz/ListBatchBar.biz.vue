<template>
  <div v-if="selectedCount > 0" class="list-batch-bar">
    <div class="list-batch-bar__left">
      <span class="list-batch-bar__text">{{ selectedText }}</span>
      <!-- 左侧扩展槽：承载 AI 建议入口等附加动作（由视图决定内容） -->
      <slot name="extra" />
    </div>
    <div class="list-batch-bar__actions">
      <a-button v-permission="batchEnablePermission" @click="emit('batch-enable')">
        <template #icon><icon-check-circle /></template>
        批量启用
      </a-button>
      <a-button v-permission="exportPermission" @click="emit('export')">
        <template #icon><icon-export /></template>
        导出
      </a-button>
      <a-button v-permission="printPermission" @click="emit('print')">
        <template #icon><icon-printer /></template>
        打印
      </a-button>
      <a-button
        v-permission="batchDeletePermission"
        status="danger"
        @click="emit('batch-delete')"
      >
        <template #icon><icon-delete /></template>
        批量删除
      </a-button>
      <a-button type="text" @click="emit('clear-selection')">取消选择</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  selectedCount: number
  /** 权限码前缀，如 'operation:frontend_demo.demo'；不传则按钮不受权限控制 */
  permissionPrefix?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedCount: 0,
  permissionPrefix: '',
})

const emit = defineEmits<{
  (e: 'clear-selection'): void
  (e: 'batch-delete'): void
  (e: 'batch-enable'): void
  (e: 'export'): void
  (e: 'print'): void
}>()

const selectedText = computed(() => `已选择 ${props.selectedCount} 项`)

// 权限码：前缀存在时拼成 `${prefix}.<action>`，前缀为空时返回 undefined（v-permission 放行）
function withPrefix(action: string): string | undefined {
  return props.permissionPrefix ? `${props.permissionPrefix}.${action}` : undefined
}

const batchDeletePermission = computed(() => withPrefix('batch_delete'))
const batchEnablePermission = computed(() => withPrefix('batch_enable'))
const exportPermission = computed(() => withPrefix('export'))
const printPermission = computed(() => withPrefix('print'))
</script>

<style scoped>
.list-batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);

  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-md);
  border-radius: var(--border-radius-default);
  background: var(--color-info-bg);
}

.list-batch-bar__left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.list-batch-bar__text {
  color: var(--color-text-body);
  font-size: var(--font-size-sm);
}

.list-batch-bar__actions {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
  gap: var(--spacing-sm);
}

@media (width < 768px) {
  .list-batch-bar {
    align-items: stretch;
  }

  .list-batch-bar__left,
  .list-batch-bar__actions {
    width: 100%;
  }

  .list-batch-bar__left {
    flex-wrap: wrap;
  }

  .list-batch-bar__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
