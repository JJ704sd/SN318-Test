/**
 * AI 助手域子入口：@core/ai/assistant
 *
 * 聚合对话式 AI 组件（悬浮入口 + 对话浮层）。业务系统仅启用「助手」子能力时
 * 按本子路径精确 import，避免连带内嵌组件（见 /ai/embedded）。
 * 共享依赖（ai store / service / Ai* 基础件）由打包器按引用收敛，不在此 re-export。
 * Arco 组件样式（H-02）：副作用 import 声明本入口依赖的 Arco 样式，消费方不再全局兜底。
 */
import '@arco-design/web-vue/es/button/style/css.js'
import '@arco-design/web-vue/es/spin/style/css.js'

export { default as AiAssistantTrigger } from './AiAssistantTrigger.vue'
export { default as AiAssistantPanel } from './AiAssistantPanel.vue'
