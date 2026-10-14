<template>
  <ByCard class="master-data-filter">
    <div class="master-data-filter__field">
      <span class="master-data-filter__label">{{ keywordSearch.label }}</span>
      <a-input
        :model-value="textValue('keyword')"
        :placeholder="keywordSearch.placeholder"
        allow-clear
        @update:model-value="updateValue('keyword', $event)"
      />
    </div>
    <div v-if="props.statusOptions" class="master-data-filter__field">
      <span class="master-data-filter__label">状态</span>
      <a-select
        :model-value="textValue('status')"
        placeholder="全部"
        allow-clear
        @update:model-value="updateValue('status', $event)"
      >
        <a-option v-for="option in props.statusOptions" :key="option.value" :value="String(option.value)">
          {{ option.label }}
        </a-option>
      </a-select>
    </div>
    <div v-if="parentSelector" class="master-data-filter__field">
      <span class="master-data-filter__label">{{ parentSelector.label }}</span>
      <MasterDataLookupSelect
        :model-value="numberValue('parent_id')"
        :resource="parentSelector.resource"
        value-field="id"
        :placeholder="parentSelector.placeholder"
        @update:model-value="updateValue('parent_id', $event)"
      />
    </div>
    <div v-if="showCurrencyFilter" class="master-data-filter__field">
      <span class="master-data-filter__label">源币种</span>
      <MasterDataLookupSelect
        :model-value="textValue('from_currency_code')"
        resource="currencies"
        value-field="code"
        placeholder="请选择源币种"
        @update:model-value="updateValue('from_currency_code', $event)"
      />
    </div>
    <div v-if="showCurrencyFilter" class="master-data-filter__field">
      <span class="master-data-filter__label">目标币种</span>
      <MasterDataLookupSelect
        :model-value="textValue('to_currency_code')"
        resource="currencies"
        value-field="code"
        placeholder="请选择目标币种"
        @update:model-value="updateValue('to_currency_code', $event)"
      />
    </div>
    <div v-if="showCurrencyFilter" class="master-data-filter__field">
      <span class="master-data-filter__label">生效日期</span>
      <a-date-picker
        :model-value="textValue('effective_date')"
        value-format="YYYY-MM-DD"
        placeholder="请选择生效日期"
        allow-clear
        @update:model-value="updateValue('effective_date', $event)"
      />
    </div>
    <div class="master-data-filter__actions">
      <a-button type="primary" @click="emit('search')">
        <template #icon><icon-search /></template>
        查询
      </a-button>
      <a-button @click="emit('reset')">重置</a-button>
    </div>
  </ByCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ByCard } from '@core/components'
import type { LmdResource } from '@/api/lmd'
import type { MasterDataStatusOption } from '../config'
import MasterDataLookupSelect from './MasterDataLookupSelect.biz.vue'

type FilterValue = string | number | undefined

const props = withDefaults(defineProps<{
  model: Record<string, FilterValue>
  resourceKey: string
  statusOptions?: MasterDataStatusOption[]
}>(), {
  model: () => ({}),
  resourceKey: '',
  statusOptions: undefined,
})

const emit = defineEmits<{
  (event: 'update:model', value: Record<string, FilterValue>): void
  (event: 'search'): void
  (event: 'reset'): void
}>()

interface ParentSelector {
  resource: LmdResource
  label: string
  placeholder: string
}

interface KeywordSearchHint {
  label: string
  placeholder: string
}

const DEFAULT_KEYWORD_SEARCH_HINT: KeywordSearchHint = {
  label: '关键词',
  placeholder: '编码、名称或关键字段',
}

const KEYWORD_SEARCH_HINTS: Record<string, KeywordSearchHint> = {
  country: { label: '关键词', placeholder: '编码、名称或英文名称' },
  province: { label: '关键词', placeholder: '编码、名称或英文名称' },
  city: { label: '关键词', placeholder: '编码、名称或英文名称' },
  district: { label: '关键词', placeholder: '编码、名称或英文名称' },
  postal_code: { label: '关键词', placeholder: '邮编或结束邮编' },
  airport: { label: '关键词', placeholder: 'IATA、ICAO、名称或英文名称' },
  port: { label: '关键词', placeholder: '编码、名称或英文名称' },
  warehouse: { label: '关键词', placeholder: '编码、名称、英文名称或地址' },
  airline: { label: '关键词', placeholder: 'IATA、ICAO、名称或英文名称' },
  transport_mode: { label: '关键词', placeholder: '编码或名称' },
  cargo_type: { label: '关键词', placeholder: '编码、名称或说明' },
  packaging_type: { label: '关键词', placeholder: '编码、名称或说明' },
  supervision_mode: { label: '关键词', placeholder: '编码、名称或说明' },
  fee_item: { label: '关键词', placeholder: '编码、名称、分组或币种' },
  currency: { label: '关键词', placeholder: '编码、名称或英文名称' },
  air_region: { label: '关键词', placeholder: '编码或名称' },
  exchange_rate: { label: '关键词', placeholder: '币种编码或汇率' },
  reference_zone: { label: '关键词', placeholder: '编码、名称、服务商或方案编码' },
}

const keywordSearch = computed(() => KEYWORD_SEARCH_HINTS[props.resourceKey] ?? DEFAULT_KEYWORD_SEARCH_HINT)

const parentSelector = computed<ParentSelector | undefined>(() => {
  const selectors: Record<string, ParentSelector> = {
    province: { resource: 'countries', label: '所属国家', placeholder: '请选择国家' },
    city: { resource: 'provinces', label: '所属省 / 州', placeholder: '请选择省 / 州' },
    district: { resource: 'cities', label: '所属城市', placeholder: '请选择城市' },
    postal_code: { resource: 'countries', label: '所属国家', placeholder: '请选择国家' },
    airport: { resource: 'countries', label: '所属国家', placeholder: '请选择国家' },
    port: { resource: 'countries', label: '所属国家', placeholder: '请选择国家' },
    warehouse: { resource: 'countries', label: '所属国家', placeholder: '请选择国家' },
  }
  return selectors[props.resourceKey]
})
const showCurrencyFilter = computed(() => props.resourceKey === 'exchange_rate')

function textValue(key: string): string {
  const value = props.model[key]
  return value === undefined ? '' : String(value)
}

function numberValue(key: string): number | undefined {
  const value = props.model[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value !== '') return Number(value)
  return undefined
}

function updateValue(key: string, value: unknown): void {
  const nextValue: FilterValue =
    typeof value === 'string' || typeof value === 'number' ? value : value === undefined ? undefined : String(value ?? '')
  emit('update:model', { ...props.model, [key]: nextValue })
}
</script>

<style scoped>
.master-data-filter {
  width: 100%;
}

.master-data-filter :deep(.by-card__body) {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: flex-end;
  gap: var(--spacing-md);
}

.master-data-filter__field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  min-width: 0;
}

.master-data-filter__field :deep(.arco-input-wrapper),
.master-data-filter__field :deep(.arco-select-view),
.master-data-filter__field :deep(.arco-input-number),
.master-data-filter__field :deep(.arco-picker) {
  width: 100%;
}

.master-data-filter__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.master-data-filter__actions {
  display: flex;
  gap: var(--spacing-sm);
}

@media (width <= 1200px) {
  .master-data-filter :deep(.by-card__body) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .master-data-filter__actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

@media (width < 768px) {
  .master-data-filter :deep(.by-card__body) {
    grid-template-columns: 1fr;
  }

  .master-data-filter__actions {
    grid-column: auto;
    justify-content: flex-start;
  }
}
</style>
