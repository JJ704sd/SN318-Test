<template>
  <ByCard class="list-filter">
    <div class="list-filter__field">
      <span class="list-filter__label">运单号</span>
      <a-input
        v-model="query.keyword"
        placeholder="请输入运单号"
        allow-clear
      />
    </div>
    <div class="list-filter__field">
      <span class="list-filter__label">状态</span>
      <a-select v-model="query.status" placeholder="全部" allow-clear>
        <a-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </a-option>
      </a-select>
    </div>
    <div class="list-filter__field">
      <span class="list-filter__label">渠道</span>
      <a-select v-model="query.bizType" placeholder="全部" allow-clear>
        <a-option v-for="opt in BIZ_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </a-option>
      </a-select>
    </div>
    <div class="list-filter__field">
      <span class="list-filter__label">下单时间</span>
      <a-range-picker v-model="dateRange" disabled-input value-format="YYYY-MM-DD" />
    </div>
    <div class="list-filter__actions">
      <a-button type="primary" @click="emit('search')">
        <template #icon><icon-search /></template>
        查询
      </a-button>
      <a-button @click="emit('reset')">重置</a-button>
    </div>
  </ByCard>
</template>

<script setup lang="ts">
import type { WaybillStatus } from '@/api/demo'
import { ByCard } from '@baiyun/template-core/components'
import type { BizType } from '@baiyun/template-core/tokens'
import { BIZ_TYPE_OPTIONS, STATUS_OPTIONS } from '../config/listConfig'

interface FilterQuery {
  keyword?: string
  status?: WaybillStatus
  bizType?: BizType
}

const query = defineModel<FilterQuery>('query', { required: true })
const dateRange = defineModel<string[]>('dateRange')

const emit = defineEmits<{
  (e: 'search'): void
  (e: 'reset'): void
}>()
</script>

<style scoped>
.list-filter {
  width: 100%;
}

.list-filter :deep(.by-card__body) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: flex-end;
  gap: var(--spacing-md);
}

.list-filter__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

/* 筛选项内控件统一铺满字段宽（覆盖主题 RangePicker fit-content / 10ch） */
.list-filter__field :deep(.arco-input-wrapper),
.list-filter__field :deep(.arco-select-view),
.list-filter__field :deep(.arco-picker.arco-picker-range) {
  display: inline-flex;
  width: 100%;
}

/* 起止两侧等分，箭头自然落在正中 */
.list-filter__field :deep(.arco-picker-range .arco-picker-input) {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
}

.list-filter__field :deep(.arco-picker-range .arco-picker-input > input) {
  width: 100%;
  min-width: 0;
}

/* 开始日期靠左，结束日期靠右；箭头居中 */
.list-filter__field :deep(.arco-picker-range .arco-picker-input:first-child > input) {
  text-align: left;
}

.list-filter__field :deep(.arco-picker-range .arco-picker-separator + .arco-picker-input > input) {
  text-align: right;
}

.list-filter__field :deep(.arco-picker-range .arco-picker-separator) {
  flex: none;
  padding: 0 var(--spacing-xs);
}

.list-filter__field :deep(.arco-picker-range .arco-picker-separator::before) {
  content: '→';
}

.list-filter__label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.list-filter__actions {
  display: flex;
  gap: var(--spacing-sm);
}

@media (width <= 1200px) {
  .list-filter :deep(.by-card__body) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .list-filter__actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (width < 768px) {
  .list-filter :deep(.by-card__body) {
    grid-template-columns: 1fr;
  }

  .list-filter__field {
    width: 100%;
  }

  .list-filter__actions {
    grid-column: auto;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
  }
}
</style>
