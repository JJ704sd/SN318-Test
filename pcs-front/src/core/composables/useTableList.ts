import { ref, reactive } from 'vue'

interface PaginatedResponse<T> {
  list: T[]
  total: number
}

interface UseTableListOptions<T, Q extends object> {
  fetchFn: (params: Q & { page: number; pageSize: number }) => Promise<PaginatedResponse<T>>
  defaultQuery?: Partial<Q>
  defaultPageSize?: number
}

export function useTableList<T extends object, Q extends object = Record<string, unknown>>(
  options: UseTableListOptions<T, Q>,
) {
  const list = ref<T[]>([]) as import('vue').Ref<T[]>
  const loading = ref(false)
  const pagination = reactive({ current: 1, pageSize: options.defaultPageSize ?? 20, total: 0 })
  const queryParams = reactive({ ...options.defaultQuery } as Partial<Q>)
  const selectedRowKeys = ref<string[]>([])
  const selectedRows = ref<T[]>([]) as import('vue').Ref<T[]>

  async function fetch() {
    loading.value = true
    try {
      const res = await options.fetchFn({
        ...queryParams,
        page: pagination.current,
        pageSize: pagination.pageSize,
      } as Q & { page: number; pageSize: number })
      list.value = res.list
      pagination.total = res.total
    } finally {
      loading.value = false
    }
  }

  function search() {
    pagination.current = 1
    clearSelection()
    fetch()
  }

  function reset() {
    Object.assign(queryParams, { ...options.defaultQuery })
    search()
  }

  function changePage(page: number, pageSize: number) {
    pagination.current = page
    pagination.pageSize = pageSize
    clearSelection()
    fetch()
  }

  function onSelectionChange(keys: string[], rows: T[]) {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  }

  function clearSelection() {
    selectedRowKeys.value = []
    selectedRows.value = []
  }

  return {
    list,
    loading,
    pagination,
    queryParams,
    selectedRowKeys,
    selectedRows,
    fetch,
    search,
    reset,
    changePage,
    onSelectionChange,
    clearSelection,
  }
}
