<template>
  <ByDrawer
    :visible="visible"
    :title="drawerTitle"
    size="large"
    :mask-closable="!editorLoading"
    @update:visible="handleVisibleUpdate"
    @close="handleClose"
  >
    <div class="master-data-relation__content">
      <MasterDataForm
        v-if="editorVisible"
        ref="formRef"
        :model="formModel"
        :fields="relationConfig.fields"
        :editing="Boolean(editingRecord)"
        @update:model="updateFormModel"
      />
      <a-tabs v-else v-model:active-key="activeTab" class="master-data-relation__tabs">
        <a-tab-pane key="basic" title="基本信息">
          <div v-if="detailFields.length > 0" class="master-data-relation__detail-grid">
            <DetailField v-for="item in detailFields" :key="item.label" :label="item.label" :value="item.value" />
          </div>
          <ByEmpty v-else preset="noData" title="暂无基本信息" />
        </a-tab-pane>
        <a-tab-pane :key="relationKey" :title="relationConfig.title">
          <MasterDataFilter
            :model="filters"
            :resource-key="relationConfig.key"
            :status-options="relationConfig.statusOptions"
            @update:model="updateFilters"
            @search="relation.search"
            @reset="relation.reset"
          />
          <ByCard>
            <div class="master-data-relation__toolbar">
              <span class="master-data-relation__total">共 <strong>{{ pagination.total }}</strong> 条</span>
              <a-button :loading="refreshing" @click="refresh">刷新</a-button>
            </div>
            <ByTable
              :columns="relationConfig.columns"
              :data="records"
              :loading="loading"
              :refreshing="refreshing"
              :pagination="pagination"
              row-key="id"
              :scroll-x="relationTableWidth"
              @page-change="relation.changePage"
            >
              <template #empty>
                <ByEmpty preset="noData" :title="`暂无${relationConfig.title}数据`">
                  <template #action>
                    <a-button v-if="canWrite" v-permission="writePermission" type="primary" @click="relation.openCreate">新增关系</a-button>
                  </template>
                </ByEmpty>
              </template>
              <template #status="{ record }">
                <ByStatusTag :status="statusType(recordValue(record, 'status'))" :text="statusText(recordValue(record, 'status'), relationConfig.statusOptions)" />
              </template>
              <template #country_id="{ record }">
                {{ referenceLabel(record, 'country_name', 'country_id') }}
              </template>
              <template #member_id="{ record }">
                {{ referenceLabel(record, 'display_name', 'member_id') }}
              </template>
              <template #action="{ record }">
                <div class="master-data-relation__actions">
                  <a-button v-if="canWrite" v-permission="writePermission" type="text" size="small" @click="relation.openEdit(recordValueRecord(record))">编辑</a-button>
                  <a-button v-if="hasStatus && canWrite" v-permission="writePermission" type="text" size="small" @click="relation.toggleStatus(recordValueRecord(record))">{{ statusAction(recordValue(record, 'status')) }}</a-button>
                  <a-button v-if="canWrite" v-permission="writePermission" type="text" size="small" status="danger" @click="relation.remove(recordValueRecord(record))">删除</a-button>
                </div>
              </template>
            </ByTable>
          </ByCard>
        </a-tab-pane>
      </a-tabs>
    </div>
    <template #footer>
      <template v-if="editorVisible">
        <a-button :disabled="editorLoading" @click="relation.closeEditor">取消</a-button>
        <a-button v-if="canWrite" v-permission="writePermission" type="primary" :loading="editorLoading" @click="saveForm">保存</a-button>
      </template>
      <a-button v-else @click="closeDrawer">关闭</a-button>
    </template>
  </ByDrawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ByCard, ByDrawer, ByEmpty, ByStatusTag, ByTable, DetailField } from '@core/components'
import { usePermissionStore } from '@core/stores'
import type { LmdRecord, LmdValue } from '@/api/lmd'
import MasterDataFilter from './MasterDataFilter.biz.vue'
import MasterDataForm from './MasterDataForm.biz.vue'
import type { MasterDataRelationFilterModel, MasterDataRelationFormModel } from '../composables/useMasterDataRelation'
import { useMasterDataRelation } from '../composables/useMasterDataRelation'
import { statusText, type MasterDataConfig, type MasterDataField } from '../config'
import { getMasterDataRelationConfig, type MasterDataRelationKey } from '../relationConfig'

const props = withDefaults(defineProps<{
  visible: boolean
  parentId: number
  parentLabel: string
  parentConfig?: MasterDataConfig
  parentRecord?: LmdRecord
  relationKey: MasterDataRelationKey
  writePermission: string
  relationWritePermission?: string
}>(), {
  visible: false,
  parentId: 0,
  parentLabel: '',
  parentConfig: undefined,
  parentRecord: undefined,
  relationKey: 'air_region_country',
  writePermission: '',
  relationWritePermission: '',
})

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'close'): void
}>()

const relationConfig = getMasterDataRelationConfig(props.relationKey)
const parentId = ref(props.parentId)
const relation = useMasterDataRelation(relationConfig, parentId)
const {
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
} = relation
const formRef = ref<InstanceType<typeof MasterDataForm>>()
const activeTab = ref<'basic' | MasterDataRelationKey>('basic')
const drawerTitle = computed(() => editorVisible.value ? editorTitle.value : `${props.parentConfig?.title ?? relationConfig.title}：${props.parentLabel}`)
const relationTableWidth = relationConfig.columns.reduce((total, column) => total + (column.width ?? 120), 0)
const permissionStore = usePermissionStore()
const writePermission = computed(() => props.writePermission)
const relationWritePermission = computed(() => props.relationWritePermission || `operation:pcs.front.${relationConfig.key}.write`)
const canWrite = computed(() => permissionStore.can(props.writePermission) && permissionStore.can(relationWritePermission.value))
const detailFields = computed(() => (props.parentConfig?.fields ?? []).map((field) => ({
  label: field.label,
  value: detailValue(field),
})))

watch(() => props.parentId, (value) => {
  parentId.value = value
  if (props.visible) void relation.fetchList()
})
watch(() => props.visible, (value) => {
  if (value) {
    activeTab.value = 'basic'
    void relation.fetchList()
  }
}, { immediate: true })

function updateFilters(value: MasterDataRelationFilterModel): void {
  filters.value = value
}

function updateFormModel(value: MasterDataRelationFormModel): void {
  formModel.value = value
}

function recordValue(record: unknown, key: string): LmdValue {
  if (!record || typeof record !== 'object') return undefined
  return (record as Record<string, LmdValue>)[key]
}

function recordValueRecord(record: unknown): LmdRecord {
  if (!record || typeof record !== 'object') return {}
  return record as LmdRecord
}

function referenceLabel(record: unknown, labelKey: string, fallbackKey: string): string {
  const label = recordValue(record, labelKey)
  if (label !== undefined && label !== null && label !== '') return String(label)
  const fallback = recordValue(record, fallbackKey)
  return fallback === undefined || fallback === null || fallback === '' ? '—' : String(fallback)
}

function detailValue(field: MasterDataField): string {
  const record = props.parentRecord
  if (!record) return '—'
  const value = recordValue(record, field.key)
  if (field.kind === 'status') return statusText(value, field.statusOptions ?? props.parentConfig?.statusOptions)
  if (field.kind === 'select') {
    const option = field.options?.find((item) => String(item.value) === String(value))
    if (option) return option.label
  }
  if (field.key.endsWith('_id')) {
    const stem = field.key.slice(0, -3)
    const reference = referenceLabel(record, `${stem}_name`, field.key)
    if (reference !== String(value ?? '')) return reference
  }
  return value === undefined || value === null || value === '' ? '—' : String(value)
}

function statusType(value: LmdValue): 'success' | 'default' {
  return Number(value) === 1 ? 'success' : 'default'
}

function statusAction(value: LmdValue): string {
  return Number(value) === 1 ? '停用' : '启用'
}

function refresh(): void {
  void relation.fetchList('refresh')
}

async function saveForm(): Promise<void> {
  await relation.save(async () => (await formRef.value?.validate()) ?? false)
}

function handleVisibleUpdate(value: boolean): void {
  if (!value && editorVisible.value) {
    relation.closeEditor()
    return
  }
  emit('update:visible', value)
}

function handleClose(): void {
  if (editorVisible.value) {
    relation.closeEditor()
    return
  }
  emit('close')
}

function closeDrawer(): void {
  if (editorLoading.value) return
  emit('update:visible', false)
  emit('close')
}
</script>

<style scoped>
.master-data-relation__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.master-data-relation__content {
  padding: var(--spacing-lg);
}

.master-data-relation__tabs {
  min-height: 0;
}

.master-data-relation__detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-lg) var(--spacing-xl);
  padding: var(--spacing-md) 0;
}

.master-data-relation__total {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.master-data-relation__total strong {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.master-data-relation__actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

@media (width < 640px) {
  .master-data-relation__detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
