import { computed, type Ref, ref } from 'vue'
import { confirmAction, successMsg } from '@core/components'
import {
  createLmdRecord,
  deleteLmdRecord,
  listLmdRecords,
  updateLmdRecord,
  type LmdListQuery,
  type LmdRecord,
  type LmdValue,
} from '@/api/lmd'
import type { MasterDataRelationConfig } from '../relationConfig'

export type MasterDataRelationFormModel = Record<string, string | number | undefined>
export type MasterDataRelationFilterModel = Record<string, string | number | undefined>

export function useMasterDataRelation(config: MasterDataRelationConfig, parentId: Ref<number>) {
  const records = ref<LmdRecord[]>([])
  const loading = ref(false)
  const refreshing = ref(false)
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const filters = ref<MasterDataRelationFilterModel>({ keyword: '', status: undefined })
  const editorVisible = ref(false)
  const editorLoading = ref(false)
  const editingRecord = ref<LmdRecord | undefined>()
  const formModel = ref<MasterDataRelationFormModel>({})

  const editorTitle = computed(() => (editingRecord.value ? `编辑${config.title}` : `新增${config.title}`))
  const hasStatus = computed(() => config.fields.some((field) => field.key === 'status'))
  const pagination = computed(() => ({ current: page.value, pageSize: pageSize.value, total: total.value }))

  function filterQuery(): LmdListQuery {
    const query: LmdListQuery = { page: page.value, page_size: pageSize.value, [config.parentField]: parentId.value }
    if (filters.value.keyword) query.keyword = filters.value.keyword
    if (filters.value.status !== undefined && filters.value.status !== '') query.status = filters.value.status
    return query
  }

  async function fetchList(mode: 'load' | 'refresh' = 'load'): Promise<void> {
    if (mode === 'refresh') refreshing.value = true
    else loading.value = true
    try {
      const result = await listLmdRecords(config.resource, filterQuery())
      records.value = result.list
      total.value = result.total
      page.value = result.page
      pageSize.value = result.page_size
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  function search(): void {
    page.value = 1
    void fetchList()
  }

  function reset(): void {
    filters.value = { keyword: '', status: undefined }
    search()
  }

  function changePage(nextPage: number, nextPageSize: number): void {
    page.value = nextPage
    pageSize.value = nextPageSize
    void fetchList()
  }

  function valueForForm(value: LmdValue): string | number | undefined {
    if (value === null || value === undefined) return undefined
    return typeof value === 'boolean' ? String(value) : value
  }

  function openCreate(): void {
    editingRecord.value = undefined
    formModel.value = Object.fromEntries(
      config.fields.map((field) => [field.key, field.key === 'status' ? 1 : undefined]),
    )
    editorVisible.value = true
  }

  function openEdit(record: LmdRecord): void {
    editingRecord.value = record
    formModel.value = Object.fromEntries(
      config.fields.map((field) => [field.key, valueForForm(record[field.key])]),
    )
    editorVisible.value = true
  }

  function closeEditor(): void {
    if (!editorLoading.value) editorVisible.value = false
  }

  function toPayload(): Record<string, LmdValue> {
    const payload: Record<string, LmdValue> = {}
    for (const field of config.fields) {
      const value = formModel.value[field.key]
      if (value === undefined || value === '') continue
      const shouldBeNumber = field.kind === 'number'
        || (field.kind === 'lookup' && field.lookup?.valueField === 'id')
      payload[field.key] = shouldBeNumber && typeof value === 'string' ? Number(value) : value
    }
    return payload
  }

  async function save(formValid: () => Promise<boolean>): Promise<void> {
    if (!(await formValid())) return
    editorLoading.value = true
    try {
      const payload = { ...toPayload(), [config.parentField]: parentId.value }
      const currentId = editingRecord.value?.id
      if (currentId === undefined) await createLmdRecord(config.resource, payload)
      else await updateLmdRecord(config.resource, currentId, payload)
      successMsg(`${editingRecord.value ? '编辑' : '新增'}成功`)
      editorVisible.value = false
      await fetchList('refresh')
    } finally {
      editorLoading.value = false
    }
  }

  async function toggleStatus(record: LmdRecord): Promise<void> {
    const nextStatus = Number(record.status) === 1 ? 0 : 1
    const action = nextStatus === 1 ? '启用' : '停用'
    const confirmed = await confirmAction({
      title: `${action}${config.title}`,
      content: `确认${action}「${String(record.country_name ?? record.country_id ?? record.id ?? '')}」？`,
    })
    if (!confirmed || record.id === undefined) return
    await updateLmdRecord(config.resource, record.id, { status: nextStatus })
    successMsg(`${action}成功`)
    await fetchList('refresh')
  }

  async function remove(record: LmdRecord): Promise<void> {
    const confirmed = await confirmAction({
      title: `删除${config.title}`,
      content: `确认删除「${String(record.country_name ?? record.country_id ?? record.member_id ?? record.id ?? '')}」？删除后不可恢复`,
      danger: true,
    })
    if (!confirmed || record.id === undefined) return
    await deleteLmdRecord(config.resource, record.id)
    successMsg('删除成功')
    await fetchList('refresh')
  }

  return {
    records,
    loading,
    refreshing,
    filters,
    pagination,
    editorVisible,
    editorLoading,
    editorTitle,
    editingRecord,
    formModel,
    hasStatus,
    fetchList,
    search,
    reset,
    changePage,
    openCreate,
    openEdit,
    closeEditor,
    save,
    toggleStatus,
    remove,
  }
}
