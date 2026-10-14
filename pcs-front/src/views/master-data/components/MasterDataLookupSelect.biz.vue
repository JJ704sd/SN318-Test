<template>
  <a-select
    :model-value="normalizedValue"
    allow-search
    allow-clear
    :filter-option="false"
    :loading="lookup.loading.value"
    :disabled="props.disabled || !props.resource || !canLookup"
    :placeholder="props.placeholder"
    @search="scheduleSearch"
    @popup-visible-change="handlePopupVisibleChange"
    @update:model-value="handleUpdate"
  >
    <a-option
      v-for="option in displayOptions"
      :key="String(option.value)"
      :value="String(option.value)"
    >
      <div class="master-data-lookup__option-label">{{ option.label }}</div>
      <div v-if="option.description" class="master-data-lookup__option-description">{{ option.description }}</div>
    </a-option>
    <template #empty>
      <span v-if="lookup.loading.value">正在搜索…</span>
      <span v-else-if="!canLookup">无读取权限</span>
      <span v-else-if="lookup.failed.value">查询失败，请稍后重试</span>
      <span v-else>暂无匹配对象</span>
    </template>
  </a-select>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { usePermissionStore } from '@core/stores'
import type { LmdListQuery, LmdResource } from '@/api/lmd'
import { getMasterDataConfigByResource } from '../config'
import { useMasterDataLookup, type MasterDataLookupOption } from '../composables/useMasterDataLookup'

type LookupValue = string | number | undefined

const props = withDefaults(defineProps<{
  modelValue?: LookupValue
  resource?: LmdResource
  valueField?: 'id' | 'code'
  query?: LmdListQuery
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: undefined,
  resource: undefined,
  valueField: 'id',
  query: () => ({}),
  placeholder: '请选择',
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: LookupValue): void
}>()

const lookup = useMasterDataLookup()
const permissionStore = usePermissionStore()
const keyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

const canLookup = computed(() => {
  if (!props.resource) return false
  const config = getMasterDataConfigByResource(props.resource)
  return !config || permissionStore.can(`operation:pcs.front.${config.key}.read`)
})
const normalizedValue = computed(() => {
  if (!canLookup.value || props.modelValue === undefined) return undefined
  return String(props.modelValue)
})
const displayOptions = computed<MasterDataLookupOption[]>(() => {
  const current = props.modelValue
  if (!canLookup.value) return []
  if (current === undefined || current === '' || lookup.options.value.some((option) => String(option.value) === String(current))) {
    return lookup.options.value
  }
  return [
    { value: current, label: String(current), description: '已保存值，输入名称或编码重新选择' },
    ...lookup.options.value,
  ]
})

function requestQuery(searchKeyword: string): LmdListQuery {
  const query: LmdListQuery = { ...props.query }
  if (!searchKeyword && props.modelValue !== undefined && props.modelValue !== '') {
    query[props.valueField] = props.modelValue
  }
  return query
}

function scheduleSearch(value: string): void {
  keyword.value = value
  if (searchTimer !== undefined) clearTimeout(searchTimer)
  const resource = props.resource
  if (!resource || !canLookup.value) return
  searchTimer = setTimeout(() => {
    void lookup.search({
      resource,
      valueField: props.valueField,
      keyword: keyword.value.trim(),
      query: requestQuery(keyword.value.trim()),
    })
  }, 240)
}

function handlePopupVisibleChange(visible: boolean): void {
  if (visible && lookup.options.value.length === 0) scheduleSearch(keyword.value)
}

function normalizeValue(value: unknown): LookupValue {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string' && props.valueField === 'id' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return String(value)
}

function handleUpdate(value: unknown): void {
  const option = lookup.options.value.find((item) => String(item.value) === String(value))
  emit('update:modelValue', option?.value ?? normalizeValue(value))
}

watch(() => props.resource, () => {
  lookup.clear()
  keyword.value = ''
})

watch(() => props.query, () => {
  lookup.clear()
  keyword.value = ''
}, { deep: true })

onMounted(() => {
  if (canLookup.value && props.modelValue !== undefined && props.modelValue !== '') scheduleSearch('')
})

onBeforeUnmount(() => {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
})
</script>

<style scoped>
.master-data-lookup__option-label {
  overflow: hidden;

  color: var(--color-text-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.master-data-lookup__option-description {
  overflow: hidden;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
