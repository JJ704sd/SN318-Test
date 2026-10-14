import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTableList } from '@core/composables'
import { confirmAction, successMsg } from '@core/components'
import { env } from '@core/config'
import type { NlFilterConditions } from '@core/ai'
import type { BizType } from '@core/styles/tokens'
import { getList, type PageQuery, type WaybillListItem } from '@/api/demo'
import { BIZ_TYPE_OPTIONS } from '../config/listConfig'
import { useStatusEdit } from './useStatusEdit'
import { useImport } from './useImport'
import { useListDetailDrawer } from './useListDetailDrawer'
import { useAiBatchAction } from './useAiBatchAction'

const TEXT = {
  aiTrigger: 'AI 建议操作',
}

/**
 * 列表页编排：查询/分页/筛选/选择、状态行内编辑、详情抽屉、导入、批量操作与
 * 嵌入式 AI（建议/自然语言筛选/空态放宽）全部收敛于此；ListView 只负责模板组装。
 */
export function useWaybillListPage() {
  const router = useRouter()

  const {
    list,
    loading,
    pagination,
    queryParams,
    selectedRowKeys,
    selectedRows,
    fetch: fetchList,
    search,
    reset: resetQuery,
    changePage,
    onSelectionChange,
    clearSelection,
  } = useTableList<WaybillListItem, PageQuery>({
    fetchFn: getList,
    defaultQuery: { keyword: '', bizType: undefined, status: undefined },
    defaultPageSize: 20,
  })

  const dateRange = ref<string[]>()

  function reset() {
    dateRange.value = undefined
    resetQuery()
  }

  const { editingId, editingStatus, startEditStatus, stopEditStatus } = useStatusEdit(
    (id, status) => {
      const target = list.value.find((item) => item.id === id)
      if (!target) return
      target.status = status
      successMsg('状态更新成功')
    },
  )

  const {
    drawerVisible,
    drawerTitle,
    detail,
    detailLoading,
    open: openDrawer,
    close: closeDrawer,
    handleWarningAction,
    handleEdit,
  } = useListDetailDrawer({
    onEdit: (id) => router.push({ name: 'demo-form', query: { id } }),
  })

  const { visible: importVisible, loading: importLoading, fileList: importFileList, cancel: handleImportCancel, confirm: handleImportConfirm } =
    useImport(fetchList)

  function onDrawerClose() {
    closeDrawer()
  }

  function goDetail(record: WaybillListItem, tab?: 'trace') {
    router.push({ name: 'demo-detail', query: tab ? { id: record.id, tab } : { id: record.id } })
  }

  function handleCreate() {
    router.push({ name: 'demo-form' })
  }

  async function handleBatchDelete() {
    const count = selectedRowKeys.value.length
    const ok = await confirmAction({
      title: '批量删除',
      content: `确认删除选中的 ${count} 项？删除后不可恢复`,
      danger: true,
    })
    if (!ok) return
    successMsg(`已成功操作 ${count} 项`)
    clearSelection()
    fetchList()
  }

  function handleBatchEnable() {
    const count = selectedRowKeys.value.length
    successMsg(`已成功操作 ${count} 项`)
    clearSelection()
    fetchList()
  }

  function handleExportAll() {
    successMsg(`已导出 ${pagination.total} 项`)
  }

  function handleExportSelected() {
    successMsg(`已导出 ${selectedRowKeys.value.length} 项`)
  }

  function handlePrint() {
    successMsg(`已发送 ${selectedRowKeys.value.length} 项到打印`)
  }

  // 嵌入式 AI · 批量动作：建议 -> 采纳 -> 待确认 -> 执行 四段链（未启用时 useAiBatchAction 返回禁用态）
  const aiEmbeddedOn = env.aiEnabled && env.aiEmbeddedEnabled
  const {
    aiStore,
    aiSuggestions,
    aiLoading,
    showAiSuggestions,
    onFetchAiSuggestions,
    onApplySuggestion,
    onCloseAiSuggestions,
  } = useAiBatchAction<WaybillListItem>({
    selectedRowKeys,
    selectedRows,
    onExecuted: () => {
      clearSelection()
      fetchList()
    },
  })

  // 自然语言筛选：AI 解析为结构化条件后回填筛选控件，用户确认/微调后点查询才执行。
  // bizType 以业务选项集收窄 core 宽类型，避免把非法值写进查询条件
  const bizTypeValues: ReadonlySet<string> = new Set(BIZ_TYPE_OPTIONS.map((o) => o.value))
  function onNlParsed(conditions: NlFilterConditions) {
    if (conditions.keyword !== undefined) queryParams.keyword = conditions.keyword
    if (conditions.bizType !== undefined && bizTypeValues.has(conditions.bizType)) {
      queryParams.bizType = conditions.bizType as BizType
    }
    if (conditions.status !== undefined) queryParams.status = conditions.status
    if (conditions.dateRange) dateRange.value = conditions.dateRange
  }

  // 空态「一键放宽」：清空筛选条件，回填到控件让用户确认后点查询
  function onRelax() {
    queryParams.keyword = ''
    queryParams.status = undefined
    queryParams.bizType = undefined
    dateRange.value = undefined
  }

  const hasActiveFilter = computed(
    () =>
      Boolean(queryParams.keyword) ||
      Boolean(queryParams.status) ||
      Boolean(queryParams.bizType) ||
      Boolean(dateRange.value && dateRange.value.length > 0),
  )

  onMounted(() => {
    fetchList()
  })

  return {
    list,
    loading,
    pagination,
    queryParams,
    dateRange,
    selectedRowKeys,
    fetchList,
    search,
    reset,
    changePage,
    clearSelection,
    onSelectionChange,
    editingId,
    editingStatus,
    startEditStatus,
    stopEditStatus,
    drawerVisible,
    drawerTitle,
    detail,
    detailLoading,
    openDrawer,
    onDrawerClose,
    handleWarningAction,
    handleEdit,
    importVisible,
    importLoading,
    importFileList,
    handleImportConfirm,
    handleImportCancel,
    handleBatchDelete,
    handleBatchEnable,
    handleExportAll,
    handleExportSelected,
    handlePrint,
    goDetail,
    handleCreate,
    aiEmbeddedOn,
    aiStore,
    aiSuggestions,
    aiLoading,
    showAiSuggestions,
    onFetchAiSuggestions,
    onApplySuggestion,
    onCloseAiSuggestions,
    onNlParsed,
    onRelax,
    hasActiveFilter,
    TEXT,
  }
}
