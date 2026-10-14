<template>
  <a-select
    :model-value="props.modelValue"
    allow-search
    allow-clear
    :filter-option="false"
    :loading="loading"
    :disabled="props.disabled"
    :placeholder="props.placeholder"
    @search="scheduleSearch"
    @popup-visible-change="handlePopupVisibleChange"
    @update:model-value="handleUpdate"
  >
    <a-option v-for="option in displayOptions" :key="option.value" :value="option.value">
      <div class="supplier-lookup-select__label">{{ option.label }}</div>
      <div v-if="option.description" class="supplier-lookup-select__description">
        {{ option.description }}
      </div>
    </a-option>
    <template #empty>
      <span v-if="loading">正在搜索…</span>
      <span v-else-if="failed">查询失败，请稍后重试</span>
      <span v-else>暂无匹配供应商</span>
    </template>
  </a-select>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { listSuppliers, type SupplierRecord } from '@/api/supplier/supplier'

/** 下拉选项：label 为供应商名称，description 为编码 / 类型的副行说明。 */
interface SupplierOption {
  value: string
  label: string
  description?: string
}

const props = withDefaults(defineProps<{
  /** 已选供应商编码 */
  modelValue?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: undefined,
  placeholder: '请选择供应商',
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | undefined): void
}>()

const SEARCH_DEBOUNCE = 240
const PAGE_SIZE = 20

const SUPPLIER_TYPE_LABEL: Record<string, string> = {
  domestic: '国内',
  overseas: '国外',
  virtual: '虚拟',
}

const options = ref<SupplierOption[]>([])
const loading = ref(false)
const failed = ref(false)
const keyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestSequence = 0

/** 已保存但不在结果集中的编码保留回显，避免编辑态空白 */
const displayOptions = computed<SupplierOption[]>(() => {
  const current = props.modelValue
  if (!current) return options.value
  if (options.value.some((option) => option.value === current)) return options.value
  return [
    { value: current, label: current, description: '已保存值，输入名称或编码重新选择' },
    ...options.value,
  ]
})

function toOption(record: SupplierRecord): SupplierOption | undefined {
  const value = record.supplier_code ?? record.code ?? record.id
  if (value === undefined) return undefined
  const typeLabel = record.supplier_type ? SUPPLIER_TYPE_LABEL[record.supplier_type] : undefined
  const description = [record.supplier_code ?? record.code, typeLabel].filter(Boolean).join(' · ')
  return {
    value: String(value),
    label: record.supplier_name ?? String(value),
    description: description === '' ? undefined : description,
  }
}

async function search(searchKeyword: string): Promise<void> {
  const sequence = ++requestSequence
  loading.value = true
  failed.value = false
  try {
    const result = await listSuppliers({ keyword: searchKeyword || undefined, page: 1, page_size: PAGE_SIZE })
    if (sequence !== requestSequence) return
    options.value = result.list
      .map(toOption)
      .filter((option): option is SupplierOption => option !== undefined)
  } catch {
    if (sequence !== requestSequence) return
    options.value = []
    failed.value = true
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

function scheduleSearch(value: string): void {
  keyword.value = value
  if (searchTimer !== undefined) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void search(keyword.value.trim())
  }, SEARCH_DEBOUNCE)
}

function handlePopupVisibleChange(visible: boolean): void {
  if (visible && options.value.length === 0) void search(keyword.value.trim())
}

function handleUpdate(value: unknown): void {
  emit('update:modelValue', value === undefined || value === null || value === '' ? undefined : String(value))
}

onMounted(() => {
  if (props.modelValue) void search('')
})

onBeforeUnmount(() => {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
})
</script>

<style scoped>
.supplier-lookup-select__label {
  overflow: hidden;

  color: var(--color-text-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.supplier-lookup-select__description {
  overflow: hidden;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
