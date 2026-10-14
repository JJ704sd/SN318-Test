/**
 * 基础 Stores 领域出口：@core/stores
 *
 * 提供用户 / 权限 / 侧栏 / 全局 Loading 状态。AI Store（useAiStore）与 AI 状态契约
 * 仅从 /ai（@core/ai）导出，不进入本入口。
 */
export { useUserStore } from './user'
export type { UserInfo } from './user'
export { usePermissionStore } from './permission'
export type { PermissionProfileSnapshot } from './permission'
export { useSiderStore } from './sider'
export { useGlobalLoadingStore } from './globalLoading'
