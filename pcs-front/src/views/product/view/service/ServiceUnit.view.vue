<template>
  <div class="service-unit-view">
    <PageHeader
      type="full"
      title="服务单元"
      subtitle="最小履约能力单元；创建时同步生成成本价卡。不再用于新编排时可禁用编排，不提供删除操作。实体状态用「启用」；价卡列对照成本价卡「生效中」"
    >
      <template #extra>
        <a-button class="service-unit-view__-btn" @click="onOrderingRules">下单规则</a-button>
        <a-button class="service-unit-view__-btn">AI文档建档</a-button>
        <a-button
          class="service-unit-view__-btn"
          type="primary"
          @click="onCreate"
        >
          新建服务单元
        </a-button>
      </template>
    </PageHeader>

    <div class="service-unit-view__content">
      <ByCard class="service-unit-view__filter">
        <div class="service-unit-view__filter-field">
          <span class="service-unit-view__filter-label">服务范围</span>
          <a-select v-model="filters.scope" placeholder="全部" allow-clear>
            <a-option v-for="option in SCOPE_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-option>
          </a-select>
        </div>
        <div class="service-unit-view__filter-field">
          <span class="service-unit-view__filter-label">状态</span>
          <a-select v-model="filters.status" placeholder="全部" allow-clear>
            <a-option v-for="option in STATUS_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-option>
          </a-select>
        </div>
        <div class="service-unit-view__filter-field service-unit-view__filter-field--keyword">
          <span class="service-unit-view__filter-label">关键词</span>
          <a-input v-model="filters.keyword" placeholder="名称/编码" allow-clear />
        </div>
        <div class="service-unit-view__filter-actions">
          <a-button class="service-unit-view__-btn" type="primary" @click="onSearch">
            搜索
          </a-button>
        </div>
      </ByCard>

      <ByCard class="service-unit-view__table">
        <ByTable
          :columns="columns"
          :data="serviceUnits"
          :loading="loading"
          :row-key="ROW_KEY"
          :row-selection="rowSelection"
          :scroll-x="tableScrollX"
          :pagination="false"
          :selected-row-keys="selectedRowKeys"
          @selection-change="onSelectionChange"
        >
          <template #empty>
            <ByEmpty preset="noData" title="暂无服务单元数据" />
          </template>
          <template #code="{ record }">
            <a class="service-unit-view__link" @click="onViewDetail(record)">{{ record.code }}</a>
          </template>
          <template #name="{ record }">
            <span class="service-unit-view__name">{{ record.name }}</span>
          </template>
          <template #coverage="{ record }">
            <ByBizTag
              v-if="record.coverage"
              :type="coverageBizType(record.coverage)"
              :label="record.coverage"
              size="small"
            />
            <span v-else class="service-unit-view__dash">—</span>
          </template>
          <template #status="{ record }">
            <ByStatusTag
              :status="record.status === 'enabled' ? 'success' : 'default'"
              :text="record.status === 'enabled' ? '启用' : '停用'"
            />
          </template>
          <template #action="{ record }">
            <div class="service-unit-view__actions">
              <a-button type="text" size="small" @click="onViewDetail(record)">详情</a-button>
              <a-button type="text" size="small" @click="onEdit(record)">编辑</a-button>
              <a-button type="text" size="small" @click="onToggleStatus(record)">
                {{ record.status === 'enabled' ? '禁用编排' : '启用' }}
              </a-button>
            </div>
          </template>
        </ByTable>
      </ByCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TableRowSelection } from '@arco-design/web-vue'
import {
  ByBizTag,
  ByCard,
  ByEmpty,
  ByStatusTag,
  ByTable,
  confirmAction,
  successMsg,
  type ByTableColumn,
} from '@core/components'
import PageHeader from '@/layout/components/PageHeader.vue'
import {
  listServiceUnits,
  setServiceUnitStatus,
  type ServiceUnitCoverage,
  type ServiceUnitItem,
  type ServiceUnitStatus,
} from '@/api/service-unit/service-unit'

/** 表单筛选项：scope / status 与 API 类型对齐；keyword 是任意文本。 */
type Coverage = ServiceUnitCoverage
type Status = ServiceUnitStatus

interface FilterOption {
  value: string
  label: string
}

interface FilterModel {
  scope: Coverage | undefined
  status: Status | undefined
  keyword: string
}

const SCOPE_OPTIONS: FilterOption[] = [
  { value: 'A', label: 'A 国内揽收' },
  { value: 'B', label: 'B 库内操作' },
  { value: 'C', label: 'C 报关操作' },
  { value: 'D', label: 'D 干线运输' },
  { value: 'E', label: 'E 清关操作' },
  { value: 'F', label: 'F 尾程服务' },
]

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
  { value: 'whitstart', label: '待生效' },
]

const ROW_KEY = 'code'

const COVERAGE_BIZ_TYPE: Record<Exclude<Coverage, ''>, 'express' | 'air' | 'fba' | 'line' | 'pickup' | 'inquiry'> = {
  A: 'express',
  B: 'air',
  C: 'fba',
  D: 'line',
  E: 'inquiry',
  F: 'pickup',
}

function coverageBizType(coverage: Coverage): 'express' | 'air' | 'fba' | 'line' | 'pickup' | 'inquiry' {
  return COVERAGE_BIZ_TYPE[coverage as Exclude<Coverage, ''>]
}

const columns: ByTableColumn[] = [
  { title: '服务单元编码', dataIndex: 'code', width: 140, fixed: 'left' },
  { title: '服务单元名称', dataIndex: 'name', width: 200, fixed: 'left' },
  { title: '服务商名称', dataIndex: 'providerName', width: 220 },
  { title: '覆盖范围', dataIndex: 'coverage', width: 120, align: 'center' },
  { title: '履约抛比', dataIndex: 'fulfillmentRatio', width: 120, align: 'right' },
  { title: 'KG/CBM', dataIndex: 'kgPerCbm', width: 120, align: 'right' },
  { title: '服务时间', dataIndex: 'serviceTime', width: 180 },
  { title: '接单时间', dataIndex: 'orderTime', width: 110 },
  { title: '截单时间', dataIndex: 'deadline', width: 110 },
  { title: '状态', dataIndex: 'status', width: 100, align: 'center' },
  { title: '操作', dataIndex: 'action', width: 220, fixed: 'right' },
]

const serviceUnits = ref<ServiceUnitItem[]>([])
const loading = ref(false)

const router = useRouter()

const filters = reactive<FilterModel>({
  scope: undefined,
  status: undefined,
  keyword: '',
})

const selectedRowKeys = ref<string[]>([])

const rowSelection = reactive<TableRowSelection>({
  type: 'checkbox',
  showCheckedAll: true,
})

const tableScrollX = computed(
  () => columns.reduce((total, column) => total + (column.width ?? 120), 0) + 60,
)

/** 拉取列表：仅在 search 触发或挂载时调用；filter 变化由 search 统一驱动，避免抖动。 */
async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const res = await listServiceUnits({
      scope: filters.scope,
      status: filters.status,
      keyword: filters.keyword,
      page: 1,
      pageSize: 100,
    })
    serviceUnits.value = res.list
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchList()
})

function onSearch(): void {
  // 关键词可能因 allow-clear 输入为空字符串，提交前 trim 再判空
  filters.keyword = filters.keyword.trim()
  void fetchList()
}

function onCreate(): void {
  void router.push({ name: 'service-unit-create' })
}

function onOrderingRules(): void {
  void router.push({ name: 'ordering-rule' })
}

function onSelectionChange(keys: string[]): void {
  selectedRowKeys.value = keys
}

function onViewDetail(record: ServiceUnitItem): void {
  void router.push({ name: 'service-unit-detail', params: { code: record.code } })
}

function onEdit(record: ServiceUnitItem): void {
  void router.push({ name: 'service-unit-edit', params: { code: record.code } })
}

/** 启用直接生效；停用即「禁用编排」，先二次确认（与原型同口径）。 */
async function onToggleStatus(record: ServiceUnitItem): Promise<void> {
  const wasEnabled = record.status === 'enabled'
  if (wasEnabled) {
    const ok = await confirmAction({
      title: '服务单元禁用编排',
      content: `确认将「${record.name}」设为禁用编排？禁用编排后不再出现在新建编排 / 组合的选用列表，已编入产品的历史链路仍保留。`,
      okText: '确认禁用编排',
    })
    if (!ok) return
  }
  await setServiceUnitStatus(record.code, wasEnabled ? 'disabled' : 'enabled')
  successMsg(wasEnabled ? `服务单元「${record.name}」已禁用编排` : `已启用服务单元「${record.name}」`)
  await fetchList()
}
</script>

<style scoped>
.service-unit-view {
  display: flex;
  flex-direction: column;
  min-width: 0;

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
}

.service-unit-view__content {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  padding-top: var(--card-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--spacing-2xl);
}

.service-unit-view__filter {
  width: 100%;
}

.service-unit-view__filter :deep(.by-card__body) {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--spacing-md);
}

.service-unit-view__filter-field {
  /* Positioning */
  display: flex;
  flex-direction: column;
  flex: none;

  /* Box Model */
  width: 140px;
  min-width: 0;
  gap: var(--spacing-xs);
}

.service-unit-view__filter-field--keyword {
  width: 200px;
}

.service-unit-view__filter-field :deep(.arco-input-wrapper),
.service-unit-view__filter-field :deep(.arco-select-view) {
  width: 100%;
}

.service-unit-view__filter-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.service-unit-view__filter-actions {
  display: flex;
  gap: var(--spacing-2xl);
}

/* 搜索按钮圆角对齐项目默认圆角：Arco 按需注入的 2px 会盖掉主题变量，这里显式指定 */
.service-unit-view__-btn {
  /* Visual */
  border-radius: var(--border-radius-default);
}

.service-unit-view__table {
  width: 100%;
}

.service-unit-view__link {
  cursor: pointer;

  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
}

.service-unit-view__link:hover {
  text-decoration: underline;
}

.service-unit-view__name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.service-unit-view__dash {
  color: var(--color-text-secondary);
}

.service-unit-view__actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

@media (width < 768px) {
  .service-unit-view__filter-field,
  .service-unit-view__filter-field--keyword {
    flex: 1 1 140px;
    width: auto;
  }
}
</style>
