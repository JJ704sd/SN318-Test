<template>
  <div class="detail-view-page">
    <PageHeader type="standard">
      <template #title>
        <span class="detail-view__title-group">
          <span class="detail-view__title">运单详情</span>
          <template v-if="detail">
            <ByStatusTag
              :status="STATUS_TYPE_MAP[detail.status]"
              :text="STATUS_LABEL[detail.status]"
            />
            <ByBizTag :type="detail.bizType" />
          </template>
        </span>
      </template>
      <template #extra>
        <a-space>
          <a-button @click="goBack">
            <template #icon><icon-left /></template>
            返回列表
          </a-button>
          <a-button v-permission="'operation:frontend_demo.demo.export'" @click="handleExport">
            <template #icon><icon-download /></template>
            导出
          </a-button>
          <a-button
            v-permission="'operation:frontend_demo.demo.edit'"
            type="primary"
            @click="goEdit"
          >
            <template #icon><icon-edit /></template>
            编辑
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="detail-view">
    <a-skeleton v-if="loading" :animation="true" class="detail-view__skeleton">
      <a-skeleton-line :rows="8" />
    </a-skeleton>

    <ByEmpty v-else-if="error" preset="error">
      <template #action>
        <a-button type="primary" @click="reload">重试</a-button>
      </template>
    </ByEmpty>

    <template v-else-if="detail">
      <AiSummaryCard
        v-if="aiEmbeddedOn && summaryContext"
        :context="summaryContext"
      />

      <div class="detail-view__summary">
        <div v-for="metric in summaryMetrics" :key="metric.label" class="detail-view__metric">
          <span class="detail-view__metric-label">{{ metric.label }}</span>
          <span class="detail-view__metric-value">{{ metric.value }}</span>
        </div>
      </div>

      <div class="detail-view__body">
        <ByCard class="detail-view__main">
          <a-tabs>
            <a-tab-pane key="basic" title="基本信息">
              <div class="detail-view__grid">
                <DetailField label="发件人" :value="detail.sender" />
                <DetailField label="发件人电话" :value="detail.senderPhone" />
                <DetailField label="收件人" :value="detail.consignee" />
                <DetailField label="收件人电话" :value="detail.consigneePhone" />
                <DetailField label="目的地" :value="detail.destination" />
                <DetailField label="重量" :value="formatWeight(detail.weight)" />
                <DetailField label="体积" :value="formatVolume(detail.volume)" />
                <DetailField label="金额" :value="formatMoney(detail.amount)" />
                <DetailField label="创建时间" :value="formatDateTime(detail.createdAt)" />
              </div>
              <DetailField
                label="备注"
                :value="detail.remark || EMPTY_TEXT"
                :clamp="2"
                class="detail-view__remark"
              />
            </a-tab-pane>
            <a-tab-pane key="trace" title="物流轨迹">
              <a-timeline>
                <a-timeline-item v-for="(node, index) in detail.traces" :key="index">
                  <div class="detail-view__trace-title">{{ node.title }}</div>
                  <div v-if="node.desc" class="detail-view__trace-desc">{{ node.desc }}</div>
                  <div class="detail-view__trace-time">{{ formatDateTime(node.time) }}</div>
                </a-timeline-item>
              </a-timeline>
            </a-tab-pane>
          </a-tabs>
        </ByCard>

        <aside class="detail-view__side">
          <ByCard title="运单摘要" class="detail-view__side-card">
            <div class="detail-view__side-fields">
              <DetailField label="运单号" :value="detail.waybillNo" />
              <DetailField label="业务类型" :value="BIZ_TYPE_LABEL[detail.bizType]" />
              <DetailField label="当前状态" :value="STATUS_LABEL[detail.status]" />
              <DetailField label="创建时间" :value="formatDateTime(detail.createdAt)" />
            </div>
          </ByCard>
        </aside>
      </div>
    </template>

    <ByEmpty v-else preset="noData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '@/layout/components/PageHeader.vue'
import { ByCard, successMsg, ByStatusTag, ByBizTag, ByEmpty, DetailField } from '@baiyun/template-core/components'
import { useDetail } from '@baiyun/template-core/composables'
import { env } from '@baiyun/template-core/config'
import { formatMoney, formatWeight, formatVolume, formatDateTime, EMPTY_TEXT } from '@baiyun/template-core/utils'
import { getDetail, type WaybillDetail } from '@/api/demo'
import { STATUS_LABEL, STATUS_TYPE_MAP, BIZ_TYPE_LABEL } from '../config/detailConfig'

const route = useRoute()
const router = useRouter()

const { detail, loading, error, load } = useDetail<WaybillDetail>({ fetchFn: getDetail })

const summaryMetrics = computed(() => {
  if (!detail.value) return []
  return [
    { label: '运单号', value: detail.value.waybillNo },
    { label: '目的地', value: detail.value.destination },
    { label: '重量', value: formatWeight(detail.value.weight) },
    { label: '金额', value: formatMoney(detail.value.amount) },
    { label: '创建时间', value: formatDateTime(detail.value.createdAt) },
  ]
})

const summaryContext = computed<Record<string, string>>(() => {
  if (!detail.value) return {} as Record<string, string>
  return {
    运单号: detail.value.waybillNo,
    状态: STATUS_LABEL[detail.value.status],
    目的地: detail.value.destination,
    金额: formatMoney(detail.value.amount),
    轨迹节点数: String(detail.value.traces?.length ?? 0),
  }
})

// AI 内嵌摘要：仅 aiEnabled && aiEmbeddedEnabled 时经 /ai/embedded 子入口异步加载，关闭则不请求
const aiEmbeddedOn = env.aiEnabled && env.aiEmbeddedEnabled
const AiSummaryCard = aiEmbeddedOn
  ? defineAsyncComponent(() =>
      import('@baiyun/template-core/ai/embedded').then((m) => m.AiSummaryCard),
    )
  : null

function currentId(): string | null {
  const id = route.query.id
  return typeof id === 'string' && id ? id : null
}

function goBack() {
  router.push({ name: 'demo-list' })
}

function goEdit() {
  const id = currentId()
  if (!id) return
  router.push({ name: 'demo-form', query: { id } })
}

function handleExport() {
  successMsg('导出成功')
}

function reload() {
  const id = currentId()
  if (id) load(id)
}

onMounted(() => {
  const id = currentId()
  if (!id) {
    router.replace({ name: 'demo-list' })
    return
  }
  load(id)
})
</script>

<style scoped>
/* 页面容器：transition 单根；左内边距由 basic-layout__content 提供 */
.detail-view-page {
  display: flex;
  flex-direction: column;
}

/* PageHeader 通栏：负 margin 顶掉内容区左边距，与侧边栏零间隙 */
.detail-view-page :deep(.page-header) {
  margin-left: calc(var(--layout-content-padding) * -1);
}

/* 承接内容区上/右/下内边距（Desktop 24 / Tablet 16 / Mobile 12，随断点 token） */
.detail-view {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap); /* 页面卡片模块间距 */

  padding-top: var(--layout-content-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--layout-content-padding);
}

.detail-view__title-group {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  vertical-align: middle;
}

.detail-view__skeleton {
  padding: var(--spacing-lg);

  background: var(--color-bg-card);
  border-radius: var(--border-radius-card);
}

.detail-view__summary {
  /* Positioning */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));

  /* Box Model */
  gap: var(--spacing-md) var(--spacing-lg);
  padding: var(--spacing-md) var(--spacing-lg);

  /* Visual */
  background: var(--color-bg-card);
  border-radius: var(--border-radius-card);
}

.detail-view__metric {
  /* Positioning */
  display: flex;
  flex-direction: column;

  /* Box Model */
  gap: var(--spacing-xs);
  padding-left: var(--spacing-lg);

  /* Misc */
  border-left: 1px solid var(--color-divider);
}

.detail-view__metric:first-child {
  padding-left: 0;

  border-left: none;
}

.detail-view__metric-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.detail-view__metric-value {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.detail-view__body {
  display: flex;
  align-items: flex-start;
  gap: var(--card-gap); /* 主内容卡与摘要卡间距 */
}

.detail-view__main {
  flex: 1 1 auto;
  min-width: 0;

  /* 配合 Tab 上移 24px，使 Tab 顶部与卡片内边缘对齐，不越出卡片。 */
  padding-top: var(--card-padding);
}

/* 详情页 Tab 默认文字使用标题色，激活态主题色与禁用态保持 Arco 语义。 */
.detail-view__main :deep(.arco-tabs-tab:not(.arco-tabs-tab-active, .arco-tabs-tab-disabled)) {
  color: var(--color-text-title);
}

/* 详情 Tab 标题区固定 56px 高并垂直居中，整个 Tab 相对卡片内容上移 24px。 */
.detail-view__main :deep(.arco-tabs) {
  margin-top: calc(var(--spacing-lg) * -1);
}

.detail-view__main :deep(.arco-tabs-nav-type-line .arco-tabs-tab) {
  height: 56px;
  padding: 0;
}

/* Tab 文字悬停时不显示 Arco 默认灰色背景，仅保留文字和激活下划线。 */
.detail-view__main :deep(.arco-tabs-nav-type-line .arco-tabs-tab:hover .arco-tabs-tab-title::before) {
  background-color: transparent;
}

.detail-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-lg);
}

.detail-view__remark {
  margin-top: var(--spacing-lg);
}

.detail-view__side {
  /* Positioning */
  position: sticky;
  top: calc(var(--layout-header-height) + var(--spacing-md));
  display: flex;
  flex-direction: column;

  /* Box Model */
  flex: 0 0 360px;
  gap: var(--spacing-md);
}

.detail-view__side-fields {
  /* Positioning */
  display: grid;
  grid-template-columns: 1fr;

  /* Box Model */
  gap: var(--spacing-md);
}

.detail-view__trace-title {
  font-size: var(--font-size-base);
  color: var(--color-text-title);
}

.detail-view__trace-desc {
  margin-top: var(--spacing-xs);

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.detail-view__trace-time {
  margin-top: var(--spacing-xs);

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

@media (width <= 1279px) {
  .detail-view__body {
    flex-direction: column;
  }

  .detail-view__side {
    position: static;
    flex-basis: auto;
    width: 100%;
  }
}
</style>
