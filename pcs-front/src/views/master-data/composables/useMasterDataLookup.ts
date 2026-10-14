import { ref } from 'vue'
import { listLmdRecords, type LmdListQuery, type LmdRecord, type LmdResource } from '@/api/lmd'

export interface MasterDataLookupOption {
  value: string | number
  label: string
  description?: string
}

export interface MasterDataLookupRequest {
  resource: LmdResource
  valueField: 'id' | 'code'
  keyword?: string
  query?: LmdListQuery
}

function recordValue(record: LmdRecord, key: string): string | number | undefined {
  const value = record[key]
  return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

function optionFromRecord(record: LmdRecord, valueField: 'id' | 'code'): MasterDataLookupOption | undefined {
  const value = recordValue(record, valueField)
  if (value === undefined) return undefined

  const label = record.name ?? record.name_en ?? record.code ?? String(value)
  const code = record.code && record.code !== label ? record.code : undefined
  const parentPath = record.parent_path ?? record.parentPath
  const descriptionParts = [code, typeof parentPath === 'string' ? parentPath : undefined].filter(Boolean)
  return {
    value,
    label,
    description: descriptionParts.length > 0 ? descriptionParts.join(' · ') : undefined,
  }
}

export function useMasterDataLookup() {
  const options = ref<MasterDataLookupOption[]>([])
  const loading = ref(false)
  const failed = ref(false)
  let requestSequence = 0

  async function search(request: MasterDataLookupRequest): Promise<void> {
    const sequence = ++requestSequence
    loading.value = true
    failed.value = false
    try {
      const result = await listLmdRecords(request.resource, {
        page: 1,
        page_size: 20,
        ...request.query,
        ...(request.keyword ? { keyword: request.keyword } : {}),
      })
      if (sequence !== requestSequence) return
      options.value = result.list
        .map((record) => optionFromRecord(record, request.valueField))
        .filter((option): option is MasterDataLookupOption => option !== undefined)
    } catch {
      if (sequence !== requestSequence) return
      options.value = []
      failed.value = true
    } finally {
      if (sequence === requestSequence) loading.value = false
    }
  }

  function clear(): void {
    requestSequence += 1
    options.value = []
    loading.value = false
    failed.value = false
  }

  return { options, loading, failed, search, clear }
}
