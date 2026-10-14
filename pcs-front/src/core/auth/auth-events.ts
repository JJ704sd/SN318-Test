/**
 * 跨标签页认证事件同步（PermissionAccessManual2 v2 增强）
 *
 * 本模块只负责认证事件传输，不感知 Pinia、Router 或 UI。
 * 清理前端状态与跳转由业务启动组合层订阅事件后完成。
 *
 * 实现：BroadcastChannel（现代浏览器原生支持，Chrome 54+ / Firefox 38+ / Safari 15.4+ / Edge 79+）
 * 不支持的环境（如旧 Safari）静默降级，仅本标签页生效。
 *
 * 防循环：广播只在"主动操作"时触发（onLogout / 路由守卫检测到 session 失效），
 * 被动接收事件后的清态 + 跳 /login 不再广播（/login 是 public 策略，路由守卫直接放行不调 getSession）。
 */

const AUTH_CHANNEL_NAME = 'baiyun-auth'

export type AuthEventType = 'logout' | 'session-expired'

export interface AuthEvent {
  type: AuthEventType
  timestamp: number
}

let channel: BroadcastChannel | null = null

/**
 * 初始化跨标签页认证事件监听。main.ts 启动时调用一次。
 * 收到 logout / session-expired 事件时清前端态 + 跳 /login。
 * 重复调用安全：会先关闭旧 channel 再建新 channel。
 */
export function subscribeAuthEvents(onEvent: (event: AuthEvent) => void): () => void {
  destroyAuthEvents()
  if (typeof BroadcastChannel === 'undefined') return () => {}

  const currentChannel = new BroadcastChannel(AUTH_CHANNEL_NAME)
  channel = currentChannel
  currentChannel.addEventListener('message', (e: MessageEvent<AuthEvent>) => {
    if (e.data?.type) onEvent(e.data)
  })

  return () => {
    currentChannel.close()
    if (channel === currentChannel) channel = null
  }
}

/** @deprecated 2.0 删除：请改用返回 dispose 的 subscribeAuthEvents。 */
export function initAuthEvents(onEvent: (event: AuthEvent) => void): void {
  subscribeAuthEvents(onEvent)
}

/** 广播认证事件到其他标签页。BroadcastChannel 不可用时静默降级（仅本标签页生效）。 */
export function broadcastAuthEvent(type: AuthEventType): void {
  channel?.postMessage({ type, timestamp: Date.now() })
}

/** 清理监听（HMR / 卸载时调用，避免重复建 channel）。 */
export function destroyAuthEvents(): void {
  channel?.close()
  channel = null
}
