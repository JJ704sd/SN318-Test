<template>
  <div class="by-table">
    <!-- 所有尺寸统一使用完整表格；窄屏由 scrollX 控制横向滚动。 -->
    <div class="by-table__desktop">
      <a-spin :loading="loading">
        <div v-if="refreshing" class="by-table__refresh-mask">
          <a-spin />
        </div>
        <a-table
          :columns="resolvedColumns"
          :data="data"
          :row-key="rowKey"
          :row-selection="rowSelectionConfig"
          :pagination="false"
          :scroll="scrollConfig"
          :table-layout-fixed="hasEllipsisColumn"
          @selection-change="onRowSelectionChange"
          @sorter-change="(...args: unknown[]) => emit('sort', args)"
        >
          <template #empty>
            <slot name="empty">
              <ByEmpty preset="noData" />
            </slot>
          </template>
          <template
            v-for="col in columns"
            :key="col.dataIndex"
            #[col.dataIndex]="{ record }"
          >
            <slot :name="col.dataIndex" :record="record" :value="record[col.dataIndex]">
              <a-tooltip v-if="col.ellipsis" :content="String(record[col.dataIndex] ?? EMPTY_TEXT)">
                <span :class="`text-ellipsis-${col.ellipsis}`">
                  {{ formatCell(col.valueType, record[col.dataIndex]) }}
                </span>
              </a-tooltip>
              <span v-else>{{ formatCell(col.valueType, record[col.dataIndex]) }}</span>
            </slot>
          </template>
        </a-table>
      </a-spin>
      <a-pagination
        v-if="paginationConfig"
        class="by-table__pagination"
        v-bind="paginationConfig"
        @change="onPageChange"
        @page-size-change="onPageSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="Row extends object = Record<string, unknown>">
import { computed } from 'vue'
import { Pagination as APagination, Spin as ASpin, Table as ATable, Tooltip as ATooltip } from '@arco-design/web-vue'
import type { TableRowSelection } from '@arco-design/web-vue'
import ByEmpty from '@core/components/base/ByEmpty/ByEmpty.vue'
import { useDevice } from '@core/composables/useDevice'
import {
  type ValueType,
  isNumericValueType,
  formatByValueType,
} from '@core/utils/valueFormat'
import { EMPTY_TEXT } from '@core/utils/constants'

export type { ValueType }

export interface ByTableColumn {
  title: string
  dataIndex: string
  fixed?: 'left' | 'right'
  valueType?: ValueType
  ellipsis?: 1 | 2
  align?: 'left' | 'right' | 'center'
  width?: number
  minWidth?: number
  [key: string]: unknown
}

export interface CardConfig {
  titleField: string
  statusField?: string
  infoFields?: string[]
  actions?: Array<{ key: string; label: string; danger?: boolean }>
}

// 注意：props 类型必须内联而非命名 interface——泛型 <script setup> 下 vue-tsc 声明生成
// 引用命名 interface 会报 TS4025（private name），内联字面量类型可正常产出 .d.ts（缺陷 #1 打包验证发现）
const props = withDefaults(
  defineProps<{
    columns: ByTableColumn[]
    data: Row[]
    loading?: boolean
    refreshing?: boolean
    pagination?: { current?: number; pageSize?: number; total?: number } | false
    rowKey?: string
    rowSelection?: boolean | TableRowSelection
    selectedRowKeys?: string[]
    /** @deprecated 所有尺寸统一使用表格，保留该属性仅用于兼容旧调用。 */
    cardConfig?: CardConfig
    /** 横向滚动阈值；有冻结列时默认开启；传 false 关闭 */
    scrollX?: number | true | false
  }>(),
  {
  loading: false,
  refreshing: false,
  pagination: () => ({ current: 1, pageSize: 20, total: 0 }),
  rowKey: 'id',
  rowSelection: false,
  scrollX: undefined,
})

const emit = defineEmits<{
  (e: 'page-change', page: number, pageSize: number): void
  (e: 'sort', sorter: unknown): void
  (e: 'selection-change', selectedRowKeys: string[], selectedRows: Row[]): void
}>()

const { isMobile } = useDevice()

/** 将 selectedRowKeys 与 data 行主键类型对齐，避免半选判断因 '1' vs 1 失效。 */
function normalizeSelectedKeys(keys: (string | number)[] | undefined): (string | number)[] {
  if (!keys?.length) return []
  const sample = props.data[0]
    ? (props.data[0] as Record<string, unknown>)[props.rowKey]
    : undefined
  if (typeof sample === 'number') {
    return keys.map((k) => Number(k))
  }
  return keys.map((k) => String(k))
}

const TABLE_SELECTION_COLUMN_WIDTH = 40

const rowSelectionConfig = computed<TableRowSelection | undefined>(() => {
  if (!props.rowSelection) return undefined
  if (props.rowSelection === true) {
    return {
      type: 'checkbox',
      width: TABLE_SELECTION_COLUMN_WIDTH,
      fixed: isMobile.value ? false : undefined,
      showCheckedAll: true,
      selectedRowKeys: normalizeSelectedKeys(props.selectedRowKeys),
    }
  }
  const fromProp = props.selectedRowKeys ?? props.rowSelection.selectedRowKeys
  return {
    ...props.rowSelection,
    width: props.rowSelection.width ?? TABLE_SELECTION_COLUMN_WIDTH,
    fixed: isMobile.value ? false : props.rowSelection.fixed,
    selectedRowKeys: normalizeSelectedKeys(
      fromProp as (string | number)[] | undefined,
    ),
  }
})

const scrollConfig = computed(() => {
  if (props.scrollX === false) return undefined
  const hasFixed = props.columns.some((col) => col.fixed)
  if (props.scrollX === true || (props.scrollX === undefined && hasFixed)) {
    return { x: '100%' }
  }
  if (typeof props.scrollX === 'number') {
    return { x: '100%', minWidth: props.scrollX }
  }
  return undefined
})

const resolvedColumns = computed(() =>
  props.columns.map(({ ellipsis: _ellipsis, ...col }) => {
    const align = col.align ?? (col.valueType && isNumericValueType(col.valueType) ? 'right' : 'left')
    return {
      ...col,
      // 窄屏下左右冻结列会占满可视区，导致中间列虽然滚动却始终被覆盖。
      // 移动端取消冻结，让完整表格按列顺序横向滑动；平板和桌面保持调用方配置。
      fixed: isMobile.value ? undefined : col.fixed,
      align,
      slotName: col.dataIndex,
    }
  }),
)

// 任一列声明 ellipsis 时切 table-layout: fixed（与 Arco 原生 ellipsis 列的行为一致）：
// auto 布局下 nowrap 内容会把列撑到内容宽度，截断省略号永远不生效
const hasEllipsisColumn = computed(() => props.columns.some((col) => !!col.ellipsis))

const paginationConfig = computed(() => {
  if (props.pagination === false) return false
  const total = props.pagination.total ?? 0
  if (total === 0 && props.data.length === 0) return false
  return {
    current: props.pagination.current ?? 1,
    pageSize: props.pagination.pageSize ?? 20,
    total,
    simple: isMobile.value,
    pageSizeOptions: [10, 20, 50, 100],
    showTotal: true,
    showPageSize: true,
    showJumper: true,
  }
})

function formatCell(valueType: ValueType | undefined, value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY_TEXT
  return formatByValueType(valueType, value)
}

function onRowSelectionChange(keys: (string | number)[]) {
  const keySet = new Set(keys.map(String))
  const rows = props.data.filter((row) =>
    keySet.has(String((row as Record<string, unknown>)[props.rowKey])),
  )
  emit('selection-change', [...keySet], rows)
}

function currentPageSize(): number {
  return props.pagination === false ? 20 : (props.pagination.pageSize ?? 20)
}

function onPageChange(page: number) {
  emit('page-change', page, currentPageSize())
}

function onPageSizeChange(pageSize: number) {
  emit('page-change', 1, pageSize)
}
</script>

<style scoped>
.by-table {
  width: 100%;
}

.by-table__desktop {
  position: relative;
  width: 100%;
}

.by-table__desktop :deep(.arco-spin) {
  display: block;
  width: 100%;
}

.by-table__desktop :deep(.arco-table-container) {
  width: 100%;
  border-radius: var(--border-radius-default);
  overflow: hidden;
}

.by-table__desktop :deep(.arco-table),
.by-table__desktop :deep(.arco-table-container),
.by-table__desktop :deep(.arco-table-content),
.by-table__desktop :deep(.arco-table-element),
.by-table__desktop :deep(table) {
  width: 100%;
}

.by-table__desktop :deep(.arco-table-container .arco-table-content) {
  width: 100%;
}

.by-table__refresh-mask {
  position: absolute;
  z-index: var(--z-base);
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-loading-local);
}

.by-table__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-md);
}

</style>
