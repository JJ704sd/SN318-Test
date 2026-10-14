<template>
  <div class="ordering-rules-view">
    <PageHeader
      type="full"
      title="下单限制规则"
      subtitle="维护全局规则项，以及指定服务单元/价卡的专属规则，服务单元勾选适用后，产品路由再聚合展示"
    >
      <template #extra>
        <a-button
          class="ordering-rules-view__btn"
          @click="onBack"
        >
          返回服务单元
        </a-button>
        <a-button
          class="ordering-rules-view__btn"
          type="primary"
          @click="onCreate"
        >
          新增限制规则
        </a-button>
      </template>
    </PageHeader>

    <div class="ordering-rules-view__content">
      <div class="ordering-rules-view__banner">
        <b>规则口径</b>：全局规则（关税预付、香港交货、超大件、是否带电）供所有服务单元勾选；指定服务单元规则仅对该单元/价卡生效（如 KLS02 欧洲低申报、寄件人香港）。加收金额不在此维护，由成本价卡条件附加费在命中后计价。
      </div>

      <ByCard class="ordering-rules-view__filter">
        <div class="ordering-rules-view__filter-field">
          <span class="ordering-rules-view__filter-label">适用范围</span>
          <a-select
            v-model="filters.scope"
            placeholder="全部规则"
            allow-clear
          >
            <a-option
              v-for="option in SCOPE_FILTER_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-option>
          </a-select>
        </div>
        <div class="ordering-rules-view__filter-field">
          <span class="ordering-rules-view__filter-label">服务单元</span>
          <a-select
            v-model="filters.scopeUnitCode"
            placeholder="全部服务单元"
            :disabled="filters.scope === 'global'"
            allow-clear
          >
            <a-option value="">全部服务单元</a-option>
            <a-option
              v-for="unit in unitOptions"
              :key="unit.code"
              :value="unit.code"
            >
              {{ unit.code }} {{ unit.name }}
            </a-option>
          </a-select>
        </div>
        <div class="ordering-rules-view__filter-actions">
          <a-button
            class="ordering-rules-view__btn"
            type="primary"
            @click="onSearch"
          >
            搜索
          </a-button>
        </div>
      </ByCard>

      <ByCard class="ordering-rules-view__table">
        <ByTable
          :columns="columns"
          :data="rules"
          :loading="loading"
          :row-key="ROW_KEY"
          :row-selection="rowSelection"
          :scroll-x="tableScrollX"
          :pagination="pagination"
          :selected-row-keys="selectedRowKeys"
          @page-change="onPageChange"
          @selection-change="onSelectionChange"
        >
          <template #empty>
            <ByEmpty preset="noData" title="暂无下单限制规则" />
          </template>
          <template #code="{ record }">
            <span class="ordering-rules-view__code">{{ record.code }}</span>
          </template>
          <template #name="{ record }">
            <span class="ordering-rules-view__name">{{ record.name }}</span>
          </template>
          <template #action-cell="{ record }">
            <div class="ordering-rules-view__actions">
              <a-button type="text" size="small" @click="onEdit(record)">编辑</a-button>
              <a-button type="text" size="small" status="danger" @click="onDelete(record)">删除</a-button>
            </div>
          </template>
          <template #status-cell="{ record }">
            <ByStatusTag
              :status="record.status === 'enabled' ? 'success' : 'default'"
              :text="record.status === 'enabled' ? '启用' : '禁用'"
            />
          </template>
          <template #scope-cell="{ record }">
            <template v-if="record.scope === 'global'">全局规则</template>
            <template v-else>指定服务单元：{{ record.scopeUnitCode }} {{ record.scopeUnitName }} {{ record.scopeProvider }}</template>
          </template>
        </ByTable>
      </ByCard>
    </div>

    <OrderingRuleFormModal
      v-model:visible="formVisible"
      :mode="formMode"
      :record="editingRule"
      :units="unitOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TableRowSelection } from '@arco-design/web-vue'
import {
  ByCard,
  ByEmpty,
  ByStatusTag,
  ByTable,
  confirmAction,
  successMsg,
  type ByTableColumn,
} from '@core/components'
import PageHeader from '@/layout/components/PageHeader.vue'
import OrderingRuleFormModal from '@/views/product/components/OrderingRuleFormModal.biz.vue'
import {
  deleteOrderingRule,
  listOrderingRules,
  listOrderingRuleUnits,
  type OrderingRuleItem,
  type OrderingRuleScope,
} from '@/api/service-unit/ordering-rule'

const ROW_KEY = 'code'

/** 适用范围筛选项：空串表示"全部规则"，与 API scope 类型对齐。 */
interface ScopeFilterOption {
  value: OrderingRuleScope
  label: string
}

const SCOPE_FILTER_OPTIONS: ScopeFilterOption[] = [
  { value: 'global', label: '全局规则' },
  { value: 'unit', label: '指定服务单元' },
]

interface UnitOption {
  code: string
  name: string
  provider: string
}

interface FilterModel {
  scope: OrderingRuleScope | undefined
  scopeUnitCode: string | undefined
}

interface PaginationModel {
  current: number
  pageSize: number
  total: number
}

const filters = reactive<FilterModel>({
  scope: undefined,
  scopeUnitCode: undefined,
})

const rules = ref<OrderingRuleItem[]>([])
const unitOptions = ref<UnitOption[]>([])
const loading = ref(false)
const selectedRowKeys = ref<string[]>([])
/** 新增 / 编辑共用同一个弹框实例，靠 mode + record 区分 */
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editingRule = ref<OrderingRuleItem | null>(null)

const pagination = reactive<PaginationModel>({
  current: 1,
  pageSize: 10,
  total: 0,
})

const rowSelection = reactive<TableRowSelection>({
  type: 'checkbox',
  showCheckedAll: true,
})

const router = useRouter()

const columns: ByTableColumn[] = [
  { title: '编码', dataIndex: 'code', width: 200, fixed: 'left' },
  { title: '规则名称', dataIndex: 'name', width: 200, fixed: 'left' },
  { title: '类型', dataIndex: 'type', width: 120 },
  { title: '处理方式', dataIndex: 'action', width: 100, align: 'center' },
  { title: '适用范围', dataIndex: 'scope-cell', width: 280 },
  { title: '说明', dataIndex: 'description', width: 320 },
  { title: '状态', dataIndex: 'status-cell', width: 100, align: 'center' },
  { title: '操作', dataIndex: 'action-cell', width: 180, fixed: 'right' },
]

const tableScrollX = computed(
  () => columns.reduce((total, column) => total + (column.width ?? 120), 0) + 60,
)

/** 仅在「指定服务单元」分支下把服务单元编码透传给 mock；全局分支 / 全部 → 透传 undefined 不过滤。 */
function buildQuery(): { scope?: OrderingRuleScope; scopeUnitCode?: string; page: number; pageSize: number } {
  const query: { scope?: OrderingRuleScope; scopeUnitCode?: string; page: number; pageSize: number } = {
    page: pagination.current,
    pageSize: pagination.pageSize,
  }
  if (filters.scope) query.scope = filters.scope
  if (filters.scope === 'unit' && filters.scopeUnitCode) query.scopeUnitCode = filters.scopeUnitCode
  return query
}

async function fetchList(): Promise<void> {
  loading.value = true
  try {
    const res = await listOrderingRules(buildQuery())
    rules.value = res.list
    pagination.total = res.total
  } finally {
    loading.value = false
  }
}

async function fetchUnitOptions(): Promise<void> {
  unitOptions.value = await listOrderingRuleUnits()
}

onMounted(() => {
  void fetchUnitOptions()
  void fetchList()
})

function onSearch(): void {
  pagination.current = 1
  void fetchList()
}

function onPageChange(page: number, pageSize: number): void {
  pagination.current = page
  pagination.pageSize = pageSize
  selectedRowKeys.value = []
  void fetchList()
}

function onSelectionChange(keys: string[]): void {
  selectedRowKeys.value = keys
}

function onBack(): void {
  void router.push({ name: 'service-unit' })
}

function onCreate(): void {
  formMode.value = 'create'
  editingRule.value = null
  formVisible.value = true
}

function onEdit(record: OrderingRuleItem): void {
  formMode.value = 'edit'
  editingRule.value = record
  formVisible.value = true
}

async function onDelete(record: OrderingRuleItem): Promise<void> {
  const ok = await confirmAction({
    title: '删除下单限制规则',
    content: `确认删除下单限制规则「${record.name}」？删除前需确保所有关联已移除，仍有引用时将拦截删除。`,
    danger: true,
  })
  if (!ok) return
  await deleteOrderingRule(record.code)
  successMsg(`已删除下单限制规则「${record.name}」`)
  await fetchList()
}
</script>

<style scoped>
.ordering-rules-view {
  display: flex;
  flex-direction: column;
  min-width: 0;

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
}

.ordering-rules-view__content {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  padding-top: var(--card-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--spacing-2xl);
}

.ordering-rules-view__btn {
  border-radius: var(--border-radius-default);
}

.ordering-rules-view__tip {
  width: 100%;
}

.ordering-rules-view__filter {
  width: 100%;
}

.ordering-rules-view__filter :deep(.by-card__body) {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--spacing-md);
}

.ordering-rules-view__filter-field {
  display: flex;
  flex-direction: column;
  flex: none;
  width: 200px;
  min-width: 0;
  gap: var(--spacing-xs);
}

.ordering-rules-view__filter-field :deep(.arco-input-wrapper),
.ordering-rules-view__filter-field :deep(.arco-select-view) {
  width: 100%;
}

.ordering-rules-view__filter-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.ordering-rules-view__filter-actions {
  display: flex;
  gap: var(--spacing-2xl);
}

.ordering-rules-view__table {
  width: 100%;
}

.ordering-rules-view__code {
  font-family: var(--font-family-mono);
  color: var(--color-text-body);
}

.ordering-rules-view__name {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.ordering-rules-view__actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

/* 规则口径引导条：中性说明色，与原型一致 */
.ordering-rules-view__banner {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-text-body);
  background-color: var(--color-bg-surface);
  border: var(--border-default);
  border-radius: var(--border-radius-default);
}

@media (width < 768px) {
  .ordering-rules-view__filter-field {
    flex: 1 1 200px;
    width: auto;
  }
}
</style>
