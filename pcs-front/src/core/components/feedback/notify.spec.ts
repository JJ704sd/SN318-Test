import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import { Notification } from '@arco-design/web-vue'
import { notify, type NotifyOptions } from './notify'

vi.mock('@arco-design/web-vue', () => ({
  Notification: {
    success: vi.fn<(cfg: CapturedNotifyConfig) => void>(),
    warning: vi.fn<(cfg: CapturedNotifyConfig) => void>(),
    error: vi.fn<(cfg: CapturedNotifyConfig) => void>(),
    info: vi.fn<(cfg: CapturedNotifyConfig) => void>(),
  },
  Button: {},
}))

type NotifyFn = (cfg: CapturedNotifyConfig) => void

interface CapturedNotifyConfig {
  title: string
  content: string
  duration: number
  closable: boolean
  position: string
  icon: () => VNode
  footer?: (() => VNode) | undefined
}

const successMock = vi.mocked(Notification.success)
const warningMock = vi.mocked(Notification.warning)
const errorMock = vi.mocked(Notification.error)
const infoMock = vi.mocked(Notification.info)

const NOTIFY_MOCKS: NotifyFn[] = [successMock, warningMock, errorMock, infoMock]

function lastConfig(mock: NotifyFn): CapturedNotifyConfig {
  return (mock as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as CapturedNotifyConfig
}

describe('feedback.notify 通知框', () => {
  afterEach(() => {
    NOTIFY_MOCKS.forEach((m) => (m as ReturnType<typeof vi.fn>).mockClear())
  })

  it('无 actions 时 footer 为 undefined，走 actions?.length 假分支，duration 用默认值', () => {
    const base: NotifyOptions = { type: 'info', title: '标题', content: '正文' }
    notify(base)
    const cfg = lastConfig(infoMock)

    expect(cfg).toMatchObject({
      title: '标题',
      content: '正文',
      duration: 4500,
      closable: true,
      position: 'topRight',
      footer: undefined,
    })
    cfg.icon()
  })

  it('显式 duration 覆盖默认值', () => {
    notify({ type: 'info', title: '标题', content: '正文', duration: 1000 })
    expect(lastConfig(infoMock).duration).toBe(1000)
  })

  it('带 actions 时 footer 为渲染函数，首个按钮 primary、其余 secondary', () => {
    const first = vi.fn<() => void>()
    const second = vi.fn<() => void>()
    notify({
      type: 'warning',
      title: '标题',
      content: '正文',
      actions: [
        { label: '重试', onClick: first },
        { label: '取消', onClick: second },
      ],
    })
    const cfg = lastConfig(warningMock)

    expect(typeof cfg.footer).toBe('function')
    const footerRoot = cfg.footer!() as VNode
    const buttons = footerRoot.children as VNode[]
    expect(buttons).toHaveLength(2)
    // index===0 → primary，index>0 → secondary 两个方向
    expect((buttons[0].props as { type: string }).type).toBe('primary')
    expect((buttons[1].props as { type: string }).type).toBe('secondary')
    // actions.map 里的 onClick 转发
    expect((buttons[0].props as { onClick: () => void }).onClick).toBe(first)
    expect((buttons[1].props as { onClick: () => void }).onClick).toBe(second)
    // default 插槽渲染动作 label
    expect((buttons[0].children as { default: () => string }).default()).toBe('重试')
    expect((buttons[1].children as { default: () => string }).default()).toBe('取消')
  })

  it('单 actions 时唯一按钮也是 primary（覆盖 index===0 且 map 只跑一次）', () => {
    notify({
      type: 'success',
      title: '标题',
      content: '正文',
      actions: [{ label: '确定', onClick: (): void => undefined }],
    })
    const cfg = lastConfig(successMock)
    const footerRoot = cfg.footer!() as VNode
    const buttons = footerRoot.children as VNode[]
    expect(buttons).toHaveLength(1)
    expect((buttons[0].props as { type: string }).type).toBe('primary')
  })

  it('四类 type 分别分发到对应 Notification 方法', () => {
    notify({ type: 'info', title: 't', content: 'c' })
    notify({ type: 'success', title: 't', content: 'c' })
    notify({ type: 'warning', title: 't', content: 'c' })
    notify({ type: 'error', title: 't', content: 'c', duration: 1 })
    expect(infoMock).toHaveBeenCalledTimes(1)
    expect(successMock).toHaveBeenCalledTimes(1)
    expect(warningMock).toHaveBeenCalledTimes(1)
    expect(errorMock).toHaveBeenCalledTimes(1)
  })
})
