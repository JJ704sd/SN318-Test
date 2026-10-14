/**
 * AI Store 域出口（/ai 内部）：useAiStore 与 AI 状态契约。
 * useAiStore / AiStatus / AiTimeoutKind 仅从 /ai（@core/ai）导出，不进入基础 /stores。
 */
export { configureAiStatusTiming, useAiStore } from './ai'
export type { AiStatus, AiTimeoutKind } from './aiStatus'
