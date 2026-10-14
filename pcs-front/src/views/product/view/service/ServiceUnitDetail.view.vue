<template>
  <div class="service-unit-detail-view">
    <PageHeader type="standard">
      <template #title>
        <span class="service-unit-detail-view__title-group">
          <span class="service-unit-detail-view__title">{{ record?.name ?? '服务单元详情' }}</span>
          <ByStatusTag v-if="record" :status="statusTag.status" :text="statusTag.text" />
        </span>
      </template>
      <template #extra>
        <a-space>
          <a-button @click="goBack">关闭</a-button>
          <a-button type="primary" @click="goEdit">编辑</a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="service-unit-detail-view__content">
      <a-skeleton v-if="loading" :animation="true" class="service-unit-detail-view__skeleton">
        <a-skeleton-line :rows="6" :line-spacing="16" />
      </a-skeleton>

      <ByEmpty v-else-if="!record" preset="noData" title="未找到该服务单元">
        <template #action>
          <a-button type="primary" @click="goBack">返回列表</a-button>
        </template>
      </ByEmpty>

      <template v-else>
        <ByCard>
          <div class="service-unit-detail-view__grid">
            <DetailField label="编码">
              <span class="service-unit-detail-view__mono">{{ record.code }}</span>
            </DetailField>
            <DetailField label="覆盖范围">
              <a-tag>{{ coverageLabel(record.coverage) }}</a-tag>
            </DetailField>
            <DetailField label="服务商名称" :value="record.providerName" />
            <DetailField label="履约抛比" :value="record.fulfillmentRatio" />
            <DetailField label="KG/CBM" :value="record.kgPerCbm" />
            <DetailField label="服务时间" :value="record.serviceTime" />
            <DetailField label="接单时间" :value="record.orderTime" />
            <DetailField label="截单时间" :value="record.deadline" />
            <DetailField label="货物准入类型" :value="goodsTypesText" />
            <DetailField label="每日负载容量" :value="capacityText" />
            <DetailField label="价卡状态">
              <ByStatusTag :status="priceCardTag.status" :text="priceCardTag.text" />
            </DetailField>
            <DetailField label="启用状态">
              <ByStatusTag :status="statusTag.status" :text="statusTag.text" />
            </DetailField>
            <DetailField label="更新人" :value="record.updatedBy" />
            <DetailField label="更新时间" :value="record.updatedAt" />
          </div>
        </ByCard>

        <div
          class="service-unit-detail-view__banner"
          :class="{ 'service-unit-detail-view__banner--unbound': !isBound }"
        >
          <template v-if="isBound">
            <b>单元价卡已绑定：</b>
            <b class="service-unit-detail-view__banner-strong">
              {{ record.priceCardCode }} · {{ record.priceCardName }}
            </b>
            {{ record.priceCardStart }} ~ {{ record.priceCardEnd }}
          </template>
          <template v-else>尚未绑定单元成本价卡</template>
          <br/>
          产品最终成本价卡不单独维护，由链路中此类单元价卡组合展示与试算。
        </div>

        <div class="service-unit-detail-view__cards">
          <ByCard title="关联成本价卡">{{ boundCardText }}</ByCard>
          <ByCard title="关联产品">暂未编入产品链路</ByCard>
          <ByCard title="📋 下单限制">
            <ServiceUnitLimits :codes="record.orderRuleCodes ?? []" />
          </ByCard>
          <ByCard title="操作内容">{{ record.operationContent || '—' }}</ByCard>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ByCard, ByEmpty, ByStatusTag, DetailField } from '@core/components'
import PageHeader from '@/layout/components/PageHeader.vue'
import ServiceUnitLimits from '@/views/product/components/ServiceUnitLimits.biz.vue'
import { getServiceUnit, type ServiceUnitItem } from '@/api/service-unit/service-unit'
import { coverageLabel } from '@/views/product/serviceUnitOptions'

const route = useRoute()
const router = useRouter()

const code = computed(() => (typeof route.params.code === 'string' ? route.params.code : ''))
const record = ref<ServiceUnitItem>()
const loading = ref(true)

onMounted(async () => {
  try {
    record.value = await getServiceUnit(code.value)
  } finally {
    loading.value = false
  }
})

const statusTag = computed(() =>
  record.value?.status === 'enabled'
    ? { status: 'success' as const, text: '启用' }
    : { status: 'default' as const, text: '停用' })

const priceCardTag = computed(() =>
  record.value?.priceCardStatus === 'bound'
    ? { status: 'success' as const, text: '生效中' }
    : { status: 'default' as const, text: '未绑定' })

const isBound = computed(() => record.value?.priceCardStatus === 'bound')
const boundCardText = computed(() =>
  isBound.value ? `${record.value?.priceCardCode} · ${record.value?.priceCardName}` : '无绑定成本价卡')
const goodsTypesText = computed(() => record.value?.goodsTypes?.join('、') ?? '')
const capacityText = computed(() =>
  record.value?.dailyCapacity ? `${record.value.dailyCapacity} KG` : '')

function goBack(): void {
  void router.push({ name: 'service-unit' })
}

function goEdit(): void {
  void router.push({ name: 'service-unit-edit', params: { code: code.value } })
}
</script>

<style scoped>
.service-unit-detail-view {
  display: flex;
  flex-direction: column;
  min-width: 0;

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
}

.service-unit-detail-view__title-group {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

/* 顶部留出页面底色，避免页头白底与卡片白底直接相接；左右与底部对齐同域列表页内容区的内边距 */
.service-unit-detail-view__content {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);

  margin: var(--card-padding) var(--layout-content-padding) var(--spacing-2xl) 0;
}

.service-unit-detail-view__skeleton {
  padding: var(--card-padding);
  background-color: var(--color-bg-card);
  border-radius: var(--border-radius-card);
}

.service-unit-detail-view__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--spacing-lg);
}

.service-unit-detail-view__banner {
  padding: var(--spacing-sm) var(--spacing-md);

  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-success);
  background-color: var(--color-success-bg);
  border: 1px solid var(--color-success-border);
  border-radius: var(--border-radius-default);
}

.service-unit-detail-view__banner--unbound {
  color: var(--color-warning);
  background-color: var(--color-warning-bg);
  border-color: var(--color-warning-border);
}

.service-unit-detail-view__banner-strong {
  font-weight: var(--font-weight-medium);
}

.service-unit-detail-view__cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

@media (width < 768px) {
  .service-unit-detail-view__grid,
  .service-unit-detail-view__cards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
