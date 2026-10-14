<template>
  <div class="master-data-page" :class="{ 'master-data-page--embedded': props.embedded }">
    <PageHeader v-if="!props.embedded" type="standard" :title="config.title">
      <template #extra>
        <a-button
          v-permission="writePermission"
          type="primary"
          @click="openCreate"
        >
          <template #icon><icon-plus /></template>
          新增{{ config.title }}
        </a-button>
      </template>
    </PageHeader>

    <div class="master-data-page__content" :class="{ 'is-embedded': props.embedded }">
      <MasterDataFilter
        :model="filters"
        :resource-key="config.key"
        :status-options="statusOptions"
        @update:model="updateFilters"
        @search="search"
        @reset="reset"
      />

      <ByCard>
        <div class="master-data-page__toolbar">
          <span class="master-data-page__total">共 <strong>{{ pagination.total }}</strong> 条</span>
          <a-button v-permission="writePermission" type="primary" @click="openCreate">
            <template #icon><icon-plus /></template>
            新增{{ config.title }}
          </a-button>
          <a-button :loading="refreshing" @click="refresh">
            <template #icon><icon-refresh /></template>
            刷新
          </a-button>
        </div>

        <ByTable
          :columns="config.columns"
          :data="records"
          :loading="loading"
          :refreshing="refreshing"
          :pagination="pagination"
          :row-key="config.idField"
          :scroll-x="tableWidth"
          @page-change="changePage"
        >
          <template #empty>
            <ByEmpty preset="noData" :title="`暂无${config.title}数据`" />
          </template>
          <template #status="{ record }">
            <ByStatusTag :status="statusType(recordValue(record, 'status'))" :text="statusText(recordValue(record, 'status'), config.statusOptions)" />
          </template>
          <template #country_id="{ record }">
            {{ relationLabel(record, 'country_id') }}
          </template>
          <template #province_id="{ record }">
            {{ relationLabel(record, 'province_id') }}
          </template>
          <template #city_id="{ record }">
            {{ relationLabel(record, 'city_id') }}
          </template>
          <template #air_region_id="{ record }">
            {{ relationLabel(record, 'air_region_id') }}
          </template>
          <template #zone_id="{ record }">
            {{ relationLabel(record, 'zone_id') }}
          </template>
          <template #member_id="{ record }">
            {{ relationLabel(record, 'member_id') }}
          </template>
          <template #action="{ record }">
            <div class="master-data-page__actions">
              <a-button v-if="relationKey && canReadRelation" type="text" size="small" @click="openRelation(recordValueRecord(record))">
                查看详情
              </a-button>
              <a-button v-permission="writePermission" type="text" size="small" @click="openEdit(recordValueRecord(record))">
                编辑
              </a-button>
              <a-button v-if="hasStatus" v-permission="writePermission" type="text" size="small" @click="toggleStatus(recordValueRecord(record))">
                {{ statusAction(recordValue(record, 'status')) }}
              </a-button>
              <a-button v-if="canDelete" v-permission="writePermission" type="text" size="small" status="danger" @click="remove(recordValueRecord(record))">
                删除
              </a-button>
            </div>
          </template>
        </ByTable>
      </ByCard>

      <a-alert v-if="config.key === 'exchange_rate'" type="info" show-icon>
        汇率按自然日区间保存，已生效记录通过结束旧区间并新增记录调整，页面不提供普通删除。
      </a-alert>
    </div>

    <ByModal
      v-model:visible="editorVisible"
      :title="editorTitle"
      mode="form-double"
      :confirm-loading="editorLoading"
      :mask-closable="!editorLoading"
      @confirm="saveForm"
      @cancel="closeEditor"
    >
      <MasterDataForm
        ref="formRef"
        :model="formModel"
        :fields="config.fields"
        :editing="Boolean(editingRecord)"
        :disabled-fields="formDisabledFields"
        @update:model="updateFormModel"
      />
    </ByModal>

    <MasterDataRelationDrawer
      v-if="relationKey && relationParent && canReadRelation"
      :visible="relationVisible"
      :parent-id="Number(relationParent.id)"
      :parent-label="String(relationParent.name ?? relationParent.code ?? relationParent.id)"
      :parent-config="config"
      :parent-record="relationParent"
      :relation-key="relationKey"
      :write-permission="writePermission"
      :relation-write-permission="relationWritePermission"
      @update:visible="relationVisible = $event"
      @close="relationVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ByCard, ByEmpty, ByModal, ByStatusTag, ByTable } from '@core/components'
import { usePermissionStore } from '@core/stores'
import type { LmdRecord, LmdValue } from '@/api/lmd'
import PageHeader from '@/layout/components/PageHeader.vue'
import MasterDataFilter from '../components/MasterDataFilter.biz.vue'
import MasterDataForm from '../components/MasterDataForm.biz.vue'
import MasterDataRelationDrawer from '../components/MasterDataRelationDrawer.biz.vue'
import { getMasterDataConfig, statusText, type MasterDataStatusOption } from '../config'
import type { MasterDataRelationKey } from '../relationConfig'
import { useMasterDataPage, type MasterDataFormModel, type MasterDataFilterModel } from '../composables/useMasterDataPage'

const props = withDefaults(defineProps<{
  embedded?: boolean
  masterDataKey?: import('../config').MasterDataKey
}>(), {
  embedded: false,
  masterDataKey: undefined,
})

const route = useRoute()
const router = useRouter()
const config = getMasterDataConfig(String(props.masterDataKey ?? route.meta.masterDataKey))
if (!config) throw new Error(`未知基础数据资源：${String(route.meta.masterDataKey)}`)

const page = useMasterDataPage(config)
const formRef = ref<InstanceType<typeof MasterDataForm>>()
const activeStatus = config.activeStatus ?? 1
const disabledStatus = config.disabledStatus ?? 0
const statusOptions = computed<MasterDataStatusOption[] | undefined>(() => {
  if (config.statusOptions) return config.statusOptions
  return config.fields.find((field) => field.key === 'status')?.statusOptions
})
const relationKey = computed<MasterDataRelationKey | undefined>(() => {
  if (config.key === 'air_region') return 'air_region_country'
  if (config.key === 'reference_zone') return 'reference_zone_member'
  return undefined
})
const relationVisible = ref(false)
const relationParent = ref<LmdRecord>()
const permissionStore = usePermissionStore()

const writePermission = computed(() => `operation:pcs.front.${config.key}.write`)
const relationReadPermission = computed(() => relationKey.value ? `operation:pcs.front.${relationKey.value}.read` : '')
const relationWritePermission = computed(() => relationKey.value ? `operation:pcs.front.${relationKey.value}.write` : '')
const canReadRelation = computed(() => Boolean(relationKey.value && permissionStore.can(relationReadPermission.value)))
const hasStatus = computed(() => config.fields.some((field) => field.key === 'status'))
const tableWidth = computed(() => config.columns.reduce((total, column) => total + (column.width ?? 120), 0))
const formDisabledFields = computed(() => {
  if (config.key !== 'exchange_rate' || !editingRecord.value) return []
  const now = new Date()
  const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-')
  const effectiveFrom = String(editingRecord.value.effective_from ?? '')
  const effectiveTo = editingRecord.value.effective_to == null ? '' : String(editingRecord.value.effective_to)
  const isEffective = effectiveFrom !== '' && effectiveFrom <= today && (effectiveTo === '' || effectiveTo >= today)
  return isEffective ? ['rate', 'effective_from'] : []
})

function updateFilters(value: MasterDataFilterModel): void {
  page.filters.value = value
}

function updateFormModel(value: MasterDataFormModel): void {
  page.formModel.value = value
}

function recordValue(record: unknown, key: string): LmdValue {
  if (!record || typeof record !== 'object') return undefined
  const value = (record as Record<string, LmdValue>)[key]
  return value
}

function recordValueRecord(record: unknown): LmdRecord {
  if (!record || typeof record !== 'object') return {}
  return record as LmdRecord
}

function relationLabel(record: unknown, key: string): string {
  const labelKeys: Record<string, string[]> = {
    country_id: ['country_name', 'country_path'],
    province_id: ['province_name', 'province_path'],
    city_id: ['city_name', 'city_path'],
    air_region_id: ['air_region_name', 'air_region_path'],
    zone_id: ['zone_name', 'zone_path'],
    member_id: ['display_name', 'member_name', 'member_path'],
  }
  for (const labelKey of labelKeys[key] ?? []) {
    const label = recordValue(record, labelKey)
    if (label !== undefined && label !== null && label !== '') return String(label)
  }
  const fallback = recordValue(record, key)
  return fallback === undefined || fallback === null || fallback === '' ? '—' : String(fallback)
}

function statusType(value: LmdValue): 'success' | 'processing' | 'warning' | 'error' | 'default' {
  if (Number(value) === activeStatus) return 'success'
  if (Number(value) === disabledStatus) return 'default'
  return 'warning'
}

function statusAction(value: LmdValue): string {
  return Number(value) === activeStatus ? '停用' : '启用'
}

function openRelation(record: LmdRecord): void {
  if (!relationKey.value || record.id === undefined) return
  relationParent.value = record
  relationVisible.value = true
}

function refresh(): void {
  void page.fetchList('refresh')
}

async function saveForm(): Promise<void> {
  await page.save(async () => (await formRef.value?.validate()) ?? false)
}

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
  canDelete,
  search,
  reset,
  changePage,
  openCreate,
  openEdit,
  closeEditor,
  toggleStatus,
  remove,
} = page

watch(
  () => route.query.create,
  (value) => {
    if (value !== '1') return
    openCreate()
  },
  { immediate: true },
)

watch(editorVisible, (visible) => {
  if (visible || route.query.create !== '1') return
  const query = { ...route.query }
  delete query.create
  void router.replace({ query })
})
</script>

<style scoped>
.master-data-page {
  display: flex;
  flex-direction: column;
  min-width: 0;

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
}

.master-data-page__content {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  padding-top: var(--card-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--spacing-2xl);
}

/* 嵌入工作区时右侧列与左侧对象列表同处一个网格行，父级已补足间距，
   这里不再叠加顶部内边距，否则筛选框会比左列卡片低一档 */
.master-data-page__content.is-embedded {
  padding-top: 0;
}

.master-data-page :deep(.arco-form-item-label > label),
.master-data-page :deep(.arco-input-wrapper),
.master-data-page :deep(.arco-input-number),
.master-data-page :deep(.arco-picker),
.master-data-page :deep(.arco-select-view) {
  font-size: var(--font-size-sm);
}

.master-data-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.master-data-page__total {
  /* 统计数靠左，新增 / 刷新按钮组留在右侧同一行 */
  margin-right: auto;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.master-data-page__total strong {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.master-data-page__actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

@media (width < 768px) {
  .master-data-page__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
