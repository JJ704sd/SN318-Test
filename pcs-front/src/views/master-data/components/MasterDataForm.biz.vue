<template>
  <ByForm ref="formRef" :model="model" :cols="2" class="master-data-form">
    <a-form-item
      v-for="field in fields"
      :key="field.key"
      :field="field.key"
      :label="field.label"
      :required="field.required"
      :rules="field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined"
      :class="{ 'by-form-span-2': field.key === 'description' || field.key === 'remark' }"
    >
      <a-select
        v-if="field.kind === 'status'"
        :model-value="String(readValue(field.key) ?? '')"
        :disabled="isDisabled(field.key)"
        placeholder="请选择状态"
        @update:model-value="updateValue(field.key, $event)"
      >
        <a-option v-for="option in field.statusOptions ?? defaultStatusOptions" :key="option.value" :value="String(option.value)">
          {{ option.label }}
        </a-option>
      </a-select>
      <MasterDataLookupSelect
        v-else-if="field.kind === 'lookup'"
        :model-value="readValue(field.key)"
        :resource="lookupFor(field)?.resource"
        :value-field="lookupFor(field)?.valueField"
        :query="lookupFor(field)?.query"
        :placeholder="field.placeholder"
        :disabled="isDisabled(field.key) || lookupFor(field)?.ready === false"
        @update:model-value="updateValue(field.key, $event)"
      />
      <a-select
        v-else-if="field.kind === 'select'"
        :model-value="String(readValue(field.key) ?? '')"
        :placeholder="field.placeholder ?? `请选择${field.label}`"
        :disabled="isDisabled(field.key)"
        allow-clear
        @update:model-value="updateValue(field.key, $event)"
      >
        <a-option v-for="option in field.options ?? []" :key="option.value" :value="String(option.value)">
          {{ option.label }}
        </a-option>
      </a-select>
      <a-date-picker
        v-else-if="field.kind === 'date'"
        :model-value="dateValue(field.key)"
        :disabled="isDisabled(field.key)"
        value-format="YYYY-MM-DD"
        placeholder="请选择日期"
        allow-clear
        @update:model-value="updateValue(field.key, $event)"
      />
      <a-input-number
        v-else-if="field.kind === 'number'"
        :model-value="numberValue(field.key)"
        :disabled="isDisabled(field.key)"
        :min="field.min"
        :max="field.max"
        :step="field.step ?? 1"
        :placeholder="field.placeholder"
        @update:model-value="updateValue(field.key, $event)"
      />
      <a-textarea
        v-else-if="field.key === 'description' || field.key === 'remark'"
        :model-value="textValue(field.key)"
        :placeholder="field.placeholder"
        :max-length="500"
        :disabled="isDisabled(field.key)"
        show-word-limit
        @update:model-value="updateValue(field.key, $event)"
      />
      <a-input
        v-else
        :model-value="textValue(field.key)"
        :placeholder="field.placeholder"
        :disabled="isDisabled(field.key)"
        allow-clear
        @update:model-value="updateValue(field.key, $event)"
      />
    </a-form-item>
  </ByForm>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ByForm } from '@core/components'
import type { LmdListQuery, LmdResource } from '@/api/lmd'
import type { MasterDataField, MasterDataLookupConfig, MasterDataStatusOption } from '../config'
import MasterDataLookupSelect from './MasterDataLookupSelect.biz.vue'

type FormValue = string | number | undefined

const defaultStatusOptions: MasterDataStatusOption[] = [
  { value: 1, label: '启用' },
  { value: 0, label: '停用' },
]

const props = withDefaults(
  defineProps<{
    model: Record<string, FormValue>
    fields: MasterDataField[]
    editing?: boolean
    disabledFields?: string[]
  }>(),
  { editing: false, disabledFields: () => [] },
)

const emit = defineEmits<{
  (event: 'update:model', value: Record<string, FormValue>): void
}>()

const formRef = ref<InstanceType<typeof ByForm>>()

async function validate(): Promise<boolean> {
  return !(await formRef.value?.validate())
}

defineExpose({ validate })

function readValue(key: string): FormValue {
  return props.model[key]
}

function textValue(key: string): string {
  const value = readValue(key)
  return value === undefined ? '' : String(value)
}

function dateValue(key: string): string | undefined {
  const value = readValue(key)
  return value === undefined || value === '' ? undefined : String(value)
}

function numberValue(key: string): number | undefined {
  const value = readValue(key)
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return undefined
}

function updateValue(key: string, value: unknown): void {
  const nextValue: FormValue =
    typeof value === 'string' || typeof value === 'number' ? value : value === undefined ? undefined : String(value ?? '')
  emit('update:model', { ...props.model, [key]: nextValue })
}

interface LookupBinding {
  resource?: LmdResource
  valueField: 'id' | 'code'
  query: LmdListQuery
  ready: boolean
}

function lookupFor(field: MasterDataField): LookupBinding | undefined {
  const config = field.lookup
  if (!config) return undefined
  const resource = resolveLookupResource(config)
  const query: LmdListQuery = {}
  for (const [queryKey, modelKey] of Object.entries(config.queryFields ?? {})) {
    query[queryKey] = props.model[modelKey]
  }
  const ready = Object.values(config.queryFields ?? {}).every((modelKey) => {
    const value = props.model[modelKey]
    return value !== undefined && value !== ''
  })
  return { resource, valueField: config.valueField, query, ready }
}

function resolveLookupResource(config: MasterDataLookupConfig): LmdResource | undefined {
  if (config.resource) return config.resource
  if (!config.resourceField) return undefined
  const selected = props.model[config.resourceField]
  return config.resourceMap?.[String(selected)]
}

watch(() => props.model.member_type, (value, previousValue) => {
  if (value === previousValue || previousValue === undefined) return
  const memberField = props.fields.find((field) => field.lookup?.resourceField === 'member_type')
  if (memberField && props.model[memberField.key] !== undefined) {
    emit('update:model', { ...props.model, [memberField.key]: undefined })
  }
})

const lookupDependencies = computed(() => props.fields.flatMap((field) => Object.values(field.lookup?.queryFields ?? {})
  .map((modelKey) => ({ modelKey, fieldKey: field.key }))))

watch(
  () => lookupDependencies.value.map(({ modelKey }) => props.model[modelKey]),
  (values, previousValues) => {
    if (previousValues.every((value) => value === undefined || value === '')) return
    const nextModel = { ...props.model }
    let changed = false
    lookupDependencies.value.forEach(({ fieldKey }, index) => {
      if (values[index] !== previousValues[index] && nextModel[fieldKey] !== undefined) {
        nextModel[fieldKey] = undefined
        changed = true
      }
    })
    if (changed) emit('update:model', nextModel)
  },
)

function isDisabled(key: string): boolean {
  if (props.disabledFields.includes(key)) return true
  return props.editing && ['code', 'postal_code', 'from_currency_code', 'to_currency_code'].includes(key)
}
</script>

<style scoped>
.master-data-form {
  width: 100%;
}

.master-data-form :deep(.arco-input-wrapper),
.master-data-form :deep(.arco-select-view),
.master-data-form :deep(.arco-picker),
.master-data-form :deep(.arco-input-number) {
  width: 100%;
}
</style>
