/**
 * AI 内嵌域子入口：@core/ai/embedded
 *
 * 聚合嵌入式 AI 组件（表单建议 / NL 筛选 / 建议栏 / 摘要 / 风险 / 输入建议）。
 * 业务系统仅启用「内嵌」子能力时按本子路径精确 import，避免连带助手组件（见 /ai/assistant）。
 * Arco 组件样式（H-02）：副作用 import 声明本入口依赖的 Arco 样式，消费方不再全局兜底。
 */
import '@arco-design/web-vue/es/button/style/css.js'
import '@arco-design/web-vue/es/input/style/css.js'
import '@arco-design/web-vue/es/spin/style/css.js'

export { default as AiPrefillField } from './AiPrefillField.vue'
export { default as AiNlFilter } from './AiNlFilter.vue'
export { default as AiActionBar } from '@core/ai/components/AiActionBar.vue'
export { default as AiSummaryCard } from './AiSummaryCard.vue'
export { default as AiRiskAlert } from './AiRiskAlert.vue'
export { default as AiSuggestInput } from './AiSuggestInput.vue'
