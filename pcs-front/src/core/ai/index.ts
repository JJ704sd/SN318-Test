/**
 * AI 域公共入口：@core/ai
 *
 * 仅导出 AI 服务/store 与轻量基础 UI 组件（AiTag/AiAvatar/AiStatusIndicator 等），
 * 供总开关开启后注册服务、以及内嵌/助手组件内部引用。面板级 UI（embedded/assistant）
 * 一律由子入口 @core/ai/embedded、@core/ai/assistant
 * 精确导入，避免注册服务时连带加载面板资源（S4-G 资源隔离）。
 *
 * 说明：
 *   - useAiStore / AiStatus / AiTimeoutKind 也仅从本域导出，不进入基础 /stores（见 S2-C）。
 *   - Arco 组件样式（H-02）：副作用 import 声明本入口依赖的 Arco 样式，消费方不再全局兜底。
 */
import '@arco-design/web-vue/es/button/style/css.js'
import '@arco-design/web-vue/es/tooltip/style/css.js'
import '@arco-design/web-vue/es/spin/style/css.js'

export { default as AiTag } from './components/AiTag.vue'
export { default as AiAvatar } from './components/AiAvatar.vue'
export { default as AiPingWave } from './components/AiPingWave.vue'
export { default as AiActiveContainer } from './components/AiActiveContainer.vue'
export { default as AiStreamCursor } from './components/AiStreamCursor.vue'
export { default as AiThinkingDots } from './components/AiThinkingDots.vue'
export { default as AiStatusIndicator } from './components/AiStatusIndicator.vue'

export { getAiService, registerAiService } from './service'
export { useAiService } from './service/useAiService'
export type { AiService } from './service'
export { MockAiAdapter } from './service/MockAiAdapter'
// 公共中断信号（S5 审查）：业务自定义 adapter 在用户中断时抛它，ai store 据此落 aborted（而非 failed）
export { AiAbortError } from './service/AiAbortError'
export type * from './service/types'

// AI Store 与状态契约：仅从本域导出，不进入基础 /stores
export { configureAiStatusTiming, useAiStore } from './store'
export type { AiStatus, AiTimeoutKind } from './store'
