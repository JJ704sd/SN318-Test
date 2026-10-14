<template>
  <div class="list-status-cell">
    <a-select
      v-if="editing"
      v-model="innerStatus"
      size="small"
      default-popup-visible
      class="list-status-cell__edit"
      @popup-visible-change="(v: boolean) => { if (!v) emit('stop-edit') }"
    >
      <a-option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </a-option>
    </a-select>
    <span v-else class="list-status-cell__display" @click="emit('start-edit')">
      <ByStatusTag :status="statusType" :text="statusLabel" />
      <icon-edit class="list-status-cell__icon" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ByStatusTag } from '@core/components'
import type { StatusType } from '@core/components'
import type { WaybillStatus } from '@/api/demo'

/**
 * 列表状态列单元格（任务 5.3 抽出 / 规范 §5.4 行内编辑）。
 *
 * 承载「展示态 -> 点击进入编辑态 -> 失焦提交」的 UI 切换；
 * 编辑态值由父组件通过 v-model 持有，本组件只 emit start-edit / stop-edit，
 * 不直接修改列表数据（数据拥有方是视图）。
 */
interface Props {
  editing: boolean
  editingStatus: WaybillStatus
  statusType: StatusType
  statusLabel: string
  statusOptions: Array<{ label: string; value: WaybillStatus }>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'start-edit'): void
  (e: 'stop-edit'): void
  (e: 'update:editingStatus', value: WaybillStatus): void
}>()

const innerStatus = computed({
  get: () => props.editingStatus,
  set: (v: WaybillStatus) => emit('update:editingStatus', v),
})
</script>

<style scoped>
.list-status-cell__edit {
  width: 90px;
}

.list-status-cell__display {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);

  cursor: pointer;
}

.list-status-cell__icon {
  /* Typographic */
  color: var(--color-text-secondary);

  /* Visual */
  opacity: 0;

  /* Misc */
  transition: opacity var(--duration-state) var(--ease-state);
}

.list-status-cell__display:hover .list-status-cell__icon {
  opacity: 1;
}
</style>
