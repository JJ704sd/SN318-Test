import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  broadcastAuthEvent,
  destroyAuthEvents,
  initAuthEvents,
  subscribeAuthEvents,
  type AuthEvent,
} from './auth-events'

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []
  listener?: (event: MessageEvent) => void
  closed = false

  constructor(readonly name: string) {
    MockBroadcastChannel.instances.push(this)
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listener = listener
  }

  postMessage() {}

  close() {
    this.closed = true
  }

  emit(data: unknown) {
    this.listener?.({ data } as MessageEvent)
  }
}

describe('auth events transport', () => {
  afterEach(() => {
    destroyAuthEvents()
    MockBroadcastChannel.instances = []
    vi.unstubAllGlobals()
  })

  it('订阅只转发认证事件并返回 dispose', () => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
    const listener = vi.fn<(event: AuthEvent) => void>()
    const dispose = subscribeAuthEvents(listener)
    const channel = MockBroadcastChannel.instances[0]
    channel?.emit({ type: 'logout', timestamp: 1 })
    expect(listener).toHaveBeenCalledWith({ type: 'logout', timestamp: 1 })
    dispose()
    expect(channel?.closed).toBe(true)
  })

  it('重复初始化关闭旧 channel，旧 initAuthEvents 保持兼容', () => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
    subscribeAuthEvents(vi.fn<(event: AuthEvent) => void>())
    const first = MockBroadcastChannel.instances[0]
    initAuthEvents(vi.fn<(event: AuthEvent) => void>())
    expect(first?.closed).toBe(true)
    expect(MockBroadcastChannel.instances).toHaveLength(2)
  })

  it('不支持 BroadcastChannel 时安全降级', () => {
    vi.stubGlobal('BroadcastChannel', undefined)
    expect(() => subscribeAuthEvents(vi.fn<(event: AuthEvent) => void>())()).not.toThrow()
  })

  it('忽略无 type / 空 data 的广播数据', () => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
    const listener = vi.fn<(event: AuthEvent) => void>()
    subscribeAuthEvents(listener)
    const channel = MockBroadcastChannel.instances[0]
    // e.data 存在但 type 为空
    channel?.emit({ timestamp: 1 } as { timestamp: number })
    // e.data 为空
    channel?.emit(null)
    expect(listener).not.toHaveBeenCalled()
  })

  it('过期 dispose 不清空仍在使用者的 channel', () => {
    const postSpy = vi.spyOn(MockBroadcastChannel.prototype, 'postMessage')
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
    const staleDispose = subscribeAuthEvents(vi.fn<(event: AuthEvent) => void>())
    subscribeAuthEvents(vi.fn<(event: AuthEvent) => void>())
    const current = MockBroadcastChannel.instances[1]
    // staleDispose 属旧的 currentChannel，channel 已指向新 channel → 不应清空
    staleDispose()
    expect(current?.closed).toBe(false)
    broadcastAuthEvent('session-expired')
    expect(postSpy).toHaveBeenCalled()
  })

  it('broadcastAuthEvent 存在 channel 时广播事件', () => {
    const postSpy = vi.spyOn(MockBroadcastChannel.prototype, 'postMessage')
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
    subscribeAuthEvents(vi.fn<(event: AuthEvent) => void>())
    broadcastAuthEvent('session-expired')
    expect(postSpy).toHaveBeenCalled()
  })

  it('broadcastAuthEvent 无 channel 时静默降级', () => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel)
    expect(() => broadcastAuthEvent('logout')).not.toThrow()
  })
})
