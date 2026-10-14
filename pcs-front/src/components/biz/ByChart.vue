<template>
  <div ref="chartRef" class="by-chart" :style="{ '--by-chart-height': `${height}px` }"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { DATA_VIZ_COLORS } from '@core/styles/tokens'

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
])

interface Props {
  /** ECharts 配置项（配色应由调用方从 tokens.ts 注入，禁止在此硬编码）。 */
  option: EChartsOption
  /** 图表高度（px），撑起容器供 ECharts 按父宽自适应。 */
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: 320,
})

const chartRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | undefined

// 拖拽调整窗口时优先保证页面布局流畅，图表在尺寸稳定后再统一重绘。
const CHART_RESIZE_DEBOUNCE = 80

// 全局主题基线：文字/坐标轴/网格统一取 Token 色，个别 option 可再覆盖
const BASE_TEXT_STYLE = { color: DATA_VIZ_COLORS.axisLabel } as const

function render() {
  if (!chart) return
  chart.setOption({ textStyle: BASE_TEXT_STYLE, ...props.option }, true)
}

function scheduleResize() {
  // 图表 resize 会触发 Canvas 全量重绘；连续拖拽时只保留最后一次。
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = undefined
    chart?.resize()
  }, CHART_RESIZE_DEBOUNCE)
}

onMounted(() => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  render()
  // 容器尺寸变化（响应式降列 / 侧栏折叠）时重绘，而非仅监听 window.resize
  resizeObserver = new ResizeObserver(scheduleResize)
  resizeObserver.observe(chartRef.value)
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  clearTimeout(resizeTimer)
  resizeTimer = undefined
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.by-chart {
  width: 100%;
  height: var(--by-chart-height);
  contain: layout paint;
}
</style>
