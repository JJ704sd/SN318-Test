/**
 * 仪表盘模板配置（实施方案任务 5.8）
 *
 * 集中 KPI 卡定义、明细表列与三张图表的 ECharts option 构造，
 * 使 DashboardView.vue 只负责组装（≤300 行）。
 * 图表配色一律取自设计 Token，禁止硬编码；业务饼图颜色在运行时读取 tokens.css。
 */
import type { Component } from 'vue'
import type { EChartsOption } from 'echarts'
import {
  IconExclamationCircle,
  IconFile,
  IconRelation,
  IconSend,
} from '@arco-design/web-vue/es/icon'
import { DATA_VIZ_COLORS } from '@core/styles/tokens'
import { formatMoney } from '@core/utils'
import type { ByTableColumn } from '@core/components'
import type { BizType } from '@core/styles/tokens'
import type { DashboardDistItem, DashboardStats } from '@/api/demo'
import { BIZ_TYPE_OPTIONS } from './listConfig'

/** 业务类型 → 中文名（复用列表页选项，避免重复维护映射）。 */
const BIZ_LABEL = Object.fromEntries(
  BIZ_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<BizType, string>

/** ECharts 使用 Canvas 绘制，需先将 tokens.css 的自定义属性解析为实际色值。 */
const BIZ_COLOR_TOKENS: Record<BizType, string> = {
  express: '--color-biz-express',
  air: '--color-biz-air',
  fba: '--color-biz-fba',
  line: '--color-biz-line',
  sea: '--color-biz-sea',
  pickup: '--color-biz-pickup',
  inquiry: '--color-biz-inquiry',
}

function getCssTokenColor(token: string): string {
  if (typeof document === 'undefined') return 'transparent'
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || 'transparent'
}

/** KPI 指标卡定义（取值键 + 标题 + 图标 + 值格式）。 */
export interface KpiCard {
  key: keyof DashboardStats['kpi']
  title: string
  icon: Component
  valueType: 'count' | 'money'
}

export const KPI_CARDS: KpiCard[] = [
  { key: 'totalWaybills', title: '运单总量', icon: IconFile, valueType: 'count' },
  { key: 'inTransitCount', title: '运输中', icon: IconSend, valueType: 'count' },
  { key: 'exceptionCount', title: '异常件', icon: IconExclamationCircle, valueType: 'count' },
  { key: 'todayAmount', title: '今日金额', icon: IconRelation, valueType: 'money' },
]

/** 明细表列（各业务线当日单量/金额/同比）。 */
export const DETAIL_COLUMNS: ByTableColumn[] = [
  { title: '业务线', dataIndex: 'bizType', fixed: 'left', width: 160 },
  { title: '当日单量', dataIndex: 'count', valueType: 'count', width: 160 },
  { title: '当日金额', dataIndex: 'amount', valueType: 'money', width: 240 },
  { title: '同比', dataIndex: 'yoy', align: 'right', width: 120 },
]

/** 手机端保留完整四列表格，内容超出时横向滚动。 */
export const DETAIL_TABLE_SCROLL_WIDTH = 680

/** 取业务类型中文名（供本文件内图表 option 构造使用）。 */
function bizLabel(type: BizType): string {
  return BIZ_LABEL[type]
}

/** 主图表：近 7 日单量趋势折线（单系列 → 主色）。 */
export function buildTrendOption(trend: DashboardStats['trend']): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      // 细竖线指示（折线图默认形态），不画整列色带；色值取自 token
      axisPointer: { type: 'line', lineStyle: { color: DATA_VIZ_COLORS.axisLine } },
    },
    grid: { left: 8, right: 16, bottom: 8, top: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.date.slice(5)),
      axisLine: { lineStyle: { color: DATA_VIZ_COLORS.axisLine } },
      axisLabel: { color: DATA_VIZ_COLORS.axisLabel },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: DATA_VIZ_COLORS.axisLabel },
      splitLine: { lineStyle: { color: DATA_VIZ_COLORS.splitLine } },
    },
    series: [
      {
        name: '单量',
        type: 'line',
        smooth: true,
        data: trend.map((t) => t.count),
        itemStyle: { color: DATA_VIZ_COLORS.primary },
        lineStyle: { color: DATA_VIZ_COLORS.primary },
        areaStyle: { color: DATA_VIZ_COLORS.primaryScale[5], opacity: 1 },
        // 悬停趋势图时，面积区域加深一档以强化当前数据系列的聚焦状态。
        emphasis: {
          areaStyle: { color: DATA_VIZ_COLORS.primaryScale[4], opacity: 1 },
        },
      },
    ],
  }
}

/** 次级图表：近 7 日金额柱状（单系列 → 主色）。 */
export function buildAmountOption(amountTrend: DashboardStats['amountTrend']): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v) => formatMoney(v as number),
      // 整列高亮：主色 6% 透明度（白底上叠加 ≈ primary-50），网格线可透出，避免实色大色块
      axisPointer: { type: 'shadow', shadowStyle: { color: `${DATA_VIZ_COLORS.primary}0F` } },
    },
    grid: { left: 8, right: 16, bottom: 8, top: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: amountTrend.map((t) => t.date.slice(5)),
      axisLine: { lineStyle: { color: DATA_VIZ_COLORS.axisLine } },
      axisLabel: { color: DATA_VIZ_COLORS.axisLabel },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: DATA_VIZ_COLORS.axisLabel },
      splitLine: { lineStyle: { color: DATA_VIZ_COLORS.splitLine } },
    },
    series: [
      {
        name: '金额',
        type: 'bar',
        barMaxWidth: 32,
        data: amountTrend.map((t) => t.amount),
        itemStyle: { color: DATA_VIZ_COLORS.primary },
      },
    ],
  }
}

/** 辅图表：业务类型分布饼图（区分业务类别 → 业务色）。 */
export function buildDistributionOption(distribution: DashboardDistItem[]): EChartsOption {
  const textColor = getCssTokenColor('--color-text-body')

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: getCssTokenColor('--color-bg-card'),
      borderColor: getCssTokenColor('--color-border'),
      borderWidth: 1,
      textStyle: { color: textColor },
    },
    legend: { bottom: 0, textStyle: { color: textColor } },
    series: [
      {
        name: '业务分布',
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { color: textColor },
        data: distribution.map((d) => ({
          name: bizLabel(d.bizType),
          value: d.count,
          itemStyle: { color: getCssTokenColor(BIZ_COLOR_TOKENS[d.bizType]) },
        })),
      },
    ],
  }
}
