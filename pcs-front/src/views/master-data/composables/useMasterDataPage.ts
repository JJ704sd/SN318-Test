import { computed, onMounted, ref } from 'vue'
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
import type { MasterDataConfig } from '../config'

export type MasterDataFormModel = Record<string, string | number | undefined>
export type MasterDataFilterModel = Record<string, string | number | undefined>

const PARENT_QUERY_KEYS: Record<string, string> = {
  province: 'country_id',
  city: 'province_id',
  district: 'city_id',
  postal_code: 'country_id',
  airport: 'country_id',
  port: 'country_id',
  warehouse: 'country_id',
  airline: 'country_id',
}

export function useMasterDataPage(config: MasterDataConfig) {
  const records = ref<LmdRecord[]>([])
  const loading = ref(false)
  const refreshing = ref(false)
  const page = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const filters = ref<MasterDataFilterModel>({ keyword: '', status: undefined, parent_id: undefined })
  const editorVisible = ref(false)
  const editorLoading = ref(false)
  const editingRecord = ref<LmdRecord | undefined>()
  const formModel = ref<MasterDataFormModel>({})

  const editorTitle = computed(() => (editingRecord.value ? `编辑${config.title}` : `新增${config.title}`))
  const canDelete = computed(() => config.allowDelete !== false)
  const pagination = computed(() => ({ current: page.value, pageSize: pageSize.value, total: total.value }))

  function filterQuery(): LmdListQuery {
    const query: LmdListQuery = { page: page.value, page_size: pageSize.value }
    const keyword = filters.value.keyword
    if (keyword) query.keyword = keyword
    const status = filters.value.status
    if (status !== undefined && status !== '') query.status = status
    const parentValue = filters.value.parent_id
    const parentKey = PARENT_QUERY_KEYS[config.key]
    if (parentKey && parentValue !== undefined && parentValue !== '') query[parentKey] = parentValue
    if (config.key === 'exchange_rate') {
      const fromCurrency = filters.value.from_currency_code
      const toCurrency = filters.value.to_currency_code
      if (fromCurrency) query.from_currency_code = fromCurrency
      if (toCurrency) query.to_currency_code = toCurrency
      const effectiveDate = filters.value.effective_date
      if (effectiveDate) query.effective_date = effectiveDate
    }
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
    filters.value = { keyword: '', status: undefined, parent_id: undefined }
    if (config.key === 'exchange_rate') {
      filters.value.from_currency_code = undefined
      filters.value.to_currency_code = undefined
      filters.value.effective_date = undefined
    }
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
      config.fields.map((field) => [field.key, field.key === 'status' ? (config.createStatus ?? 1) : undefined]),
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
      if (editingRecord.value && (field.key === config.idField || ['code', 'postal_code', 'from_currency_code', 'to_currency_code'].includes(field.key))) continue
      const shouldBeNumber = field.kind === 'number'
        || field.kind === 'status'
        || (field.kind === 'lookup' && field.lookup?.valueField === 'id')
      payload[field.key] = shouldBeNumber && typeof value === 'string' ? Number(value) : value
    }
    return payload
  }

  function recordId(record: LmdRecord): string | number | undefined {
    const value = record[config.idField]
    return typeof value === 'string' || typeof value === 'number' ? value : undefined
  }

  async function save(formValid: () => Promise<boolean>): Promise<void> {
    if (!(await formValid())) return
    editorLoading.value = true
    try {
      const payload = toPayload()
      const currentId = editingRecord.value ? recordId(editingRecord.value) : undefined
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
    const current = Number(record.status ?? 0)
    const activeStatus = config.activeStatus ?? 1
    const disabledStatus = config.disabledStatus ?? 0
    const nextStatus = current === activeStatus ? disabledStatus : activeStatus
    const action = nextStatus === 1 ? '启用' : '停用'
    const confirmed = await confirmAction({
      title: `${action}${config.title}`,
      content: `确认${action}「${String(record.name ?? record.code ?? record.id ?? '')}」？`,
    })
    if (!confirmed) return
    const id = recordId(record)
    if (id === undefined) return
    await updateLmdRecord(config.resource, id, { status: nextStatus })
    successMsg(`${action}成功`)
    await fetchList('refresh')
  }

  async function remove(record: LmdRecord): Promise<void> {
    if (!canDelete.value) return
    const confirmed = await confirmAction({
      title: `删除${config.title}`,
      content: `确认删除「${String(record.name ?? record.code ?? record.id ?? '')}」？删除后不可恢复`,
      danger: true,
    })
    if (!confirmed) return
    const id = recordId(record)
    if (id === undefined) return
    await deleteLmdRecord(config.resource, id)
    successMsg('删除成功')
    await fetchList('refresh')
  }

  onMounted(() => {
    void fetchList()
  })

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
    canDelete,
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
