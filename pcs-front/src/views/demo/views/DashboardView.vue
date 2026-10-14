<template>
  <div class="dashboard-view-page">
    <PageHeader type="standard" title="运营仪表盘">
      <template #extra>
        <a-radio-group v-model="period" type="button" size="medium">
          <a-radio value="7">近7日</a-radio>
          <a-radio value="30">近30日</a-radio>
          <a-radio value="month">本月</a-radio>
        </a-radio-group>
      </template>
    </PageHeader>

    <div class="dashboard-view">
    <!-- KPI 指标卡：Desktop 4 列 / Tablet 3 列 / Mobile 1–2 列 -->
    <div class="dashboard-view__kpi-grid">
      <ByCard v-for="card in KPI_CARDS" :key="card.key">
        <div class="kpi-card__inner">
          <div class="kpi-card__meta">
            <span class="kpi-card__title">{{ card.title }}</span>
            <component :is="card.icon" class="kpi-card__icon" :size="20" />
          </div>
          <div class="kpi-card__value">
            {{ formatKpiValue(card.valueType, stats?.kpi[card.key].value ?? 0) }}
          </div>
          <div
            class="kpi-card__yoy"
            :class="yoyClass(stats?.kpi[card.key].yoy ?? 0)"
          >
            <icon-arrow-rise v-if="(stats?.kpi[card.key].yoy ?? 0) > 0" :size="12" />
            <icon-arrow-fall v-else-if="(stats?.kpi[card.key].yoy ?? 0) < 0" :size="12" />
            {{ Math.abs(stats?.kpi[card.key].yoy ?? 0).toFixed(2) }}% 同比
          </div>
        </div>
      </ByCard>
    </div>

    <AiSummaryCard
      v-if="aiEmbeddedOn && stats"
      :key="aiInsightKey"
      title="AI 数据洞察"
      :context="aiContext"
      evidence="基于本页 KPI 指标与近 7 日趋势数据生成"
    />

    <!-- 图表区：24 栅格 主 16 / 辅 8；上下左右间距跟随卡片间距 -->
    <a-row :gutter="chartGutter">
      <a-col :xs="24" :sm="24" :md="16" :lg="16">
        <ByCard title="运单量趋势">
          <ByChart :option="trendOption" :height="280" />
        </ByCard>
      </a-col>
      <a-col :xs="24" :sm="24" :md="8" :lg="8">
        <ByCard title="业务类型分布">
          <ByChart :option="distributionOption" :height="280" />
        </ByCard>
      </a-col>
      <a-col :xs="24" :sm="24" :md="24" :lg="24">
        <ByCard title="金额趋势">
          <ByChart :option="amountOption" :height="260" />
        </ByCard>
      </a-col>
    </a-row>

    <!-- 明细区：撑满内容区、不限最大宽 -->
    <ByCard title="业务线明细">
      <ByTable
        :columns="DETAIL_COLUMNS"
        :data="pagedDetail"
        :loading="loading"
        :pagination="pagination"
        :scroll-x="DETAIL_TABLE_SCROLL_WIDTH"
        row-key="id"
        @page-change="changePage"
      >
        <template #bizType="{ record }">
          <ByBizTag :type="(record as DashboardDetailRow).bizType" />
        </template>
        <template #yoy="{ record }">
          <span :class="yoyClass((record as DashboardDetailRow).yoy)">
            {{ (record as DashboardDetailRow).yoy > 0 ? '+' : ''
            }}{{ (record as DashboardDetailRow).yoy.toFixed(2) }}%
          </span>
        </template>
      </ByTable>
    </ByCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import PageHeader from '@/layout/components/PageHeader.vue'
import { ByCard, ByTable, ByBizTag } from '@core/components'
import { useDevice } from '@core/composables'
import { formatCount, formatMoney } from '@core/utils'
import { env } from '@core/config'
import ByChart from '@/components/biz/ByChart.vue'
import { getDashboardStats, type DashboardDetailRow, type DashboardStats } from '@/api/demo'
import {
  KPI_CARDS,
  DETAIL_COLUMNS,
  DETAIL_TABLE_SCROLL_WIDTH,
  buildTrendOption,
  buildAmountOption,
  buildDistributionOption,
} from '../config/dashboardConfig'

// 初始每页 5 条，令 7 条明细跨 2 页以演示翻页；下拉可切至 10/20/50/100（ByTable 内置档位）
const DETAIL_DEFAULT_PAGE_SIZE = 5

const stats = ref<DashboardStats | null>(null)
const loading = ref(false)
const period = ref<'7' | '30' | 'month'>('7')
const detailPage = ref(1)
const detailPageSize = ref(DETAIL_DEFAULT_PAGE_SIZE)
// 切换 period 重新拉取后递增，令 AiSummaryCard 重新走 onMounted(generate)
const aiInsightKey = ref(0)
const { device } = useDevice()

// Arco Row gutter 需要数值；与 --card-gap 的 Desktop / Tablet / Mobile 阶梯保持一致。
const chartGutter = computed<[number, number]>(() => {
  if (device.value === 'mobile') return [8, 8]
  if (device.value === 'tablet') return [12, 12]
  return [16, 16]
})

// AI 内嵌洞察：仅 aiEnabled && aiEmbeddedEnabled 时经 /ai/embedded 子入口异步加载，关闭则不请求
const aiEmbeddedOn = env.aiEnabled && env.aiEmbeddedEnabled
const AiSummaryCard = aiEmbeddedOn
  ? defineAsyncComponent(() =>
      import('@core/ai/embedded').then((m) => m.AiSummaryCard),
    )
  : null

const trendOption = computed(() => buildTrendOption(stats.value?.trend ?? []))
const amountOption = computed(() => buildAmountOption(stats.value?.amountTrend ?? []))
const distributionOption = computed(() =>
  buildDistributionOption(stats.value?.distribution ?? []),
)

const detailList = computed<DashboardDetailRow[]>(() => stats.value?.detailList ?? [])

const pagedDetail = computed(() => {
  const start = (detailPage.value - 1) * detailPageSize.value
  return detailList.value.slice(start, start + detailPageSize.value)
})

const pagination = computed(() => ({
  current: detailPage.value,
  pageSize: detailPageSize.value,
  total: detailList.value.length,
}))

const aiContext = computed((): Record<string, string> => {
  const s = stats.value
  if (!s) return {}
  const trendStart = s.trend[0]?.count ?? 0
  const trendEnd = s.trend[s.trend.length - 1]?.count ?? 0
  return {
    运单总量: formatCount(s.totalWaybills),
    '运单总量同比': `${s.kpi.totalWaybills.yoy.toFixed(2)}%`,
    运输中: formatCount(s.inTransitCount),
    异常件: formatCount(s.exceptionCount),
    '异常件同比': `${s.kpi.exceptionCount.yoy.toFixed(2)}%`,
    今日金额: formatMoney(s.todayAmount),
    '今日金额同比': `${s.kpi.todayAmount.yoy.toFixed(2)}%`,
    '近7日单量趋势': `${trendStart}->${trendEnd}`,
  }
})

function formatKpiValue(valueType: 'count' | 'money', value: number): string {
  return valueType === 'money' ? formatMoney(value) : formatCount(value)
}

function yoyClass(yoy: number): string {
  if (yoy > 0) return 'dashboard-view__yoy--up'
  if (yoy < 0) return 'dashboard-view__yoy--down'
  return ''
}

function changePage(page: number, pageSize: number) {
  detailPage.value = page
  detailPageSize.value = pageSize
}

async function fetchStats() {
  loading.value = true
  try {
    stats.value = await getDashboardStats()
    detailPage.value = 1
    detailPageSize.value = DETAIL_DEFAULT_PAGE_SIZE
    aiInsightKey.value++
  } finally {
    loading.value = false
  }
}

// 时间档位切换即重新拉取（mock 暂返回同一批数据，真实接口按 period 传参）
watch(period, fetchStats)

onMounted(fetchStats)
</script>

<style scoped>
/* 页面容器：transition 单根；左内边距由 basic-layout__content 提供 */
.dashboard-view-page {
  display: flex;
  flex-direction: column;
}

/* PageHeader 通栏：负 margin 顶掉内容区左边距，与侧边栏零间隙 */
.dashboard-view-page :deep(.page-header) {
  margin-left: calc(var(--layout-content-padding) * -1);
}

/* 承接内容区上/右/下内边距（Desktop 24 / Tablet 16 / Mobile 12，随断点 token） */
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap); /* KPI、图表、明细的上下间距：Desktop 16 / Tablet 12 / Mobile 8 */

  padding-top: var(--layout-content-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--layout-content-padding);
}

/* KPI 网格：Desktop 4 列 / Tablet 3 列 / Mobile 2 列（≤480 降 1 列） */
.dashboard-view__kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--card-gap);
}

@media (width <= 1279px) {
  .dashboard-view__kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (width <= 767px) {
  .dashboard-view__kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 480px) {
  .dashboard-view__kpi-grid {
    grid-template-columns: 1fr;
  }
}

.kpi-card__inner {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.kpi-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-card__title {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.kpi-card__icon {
  color: var(--color-primary);
}

.kpi-card__value {
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.kpi-card__yoy {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.dashboard-view__yoy--up {
  color: var(--color-success);
}

.dashboard-view__yoy--down {
  color: var(--color-error);
}
</style>
