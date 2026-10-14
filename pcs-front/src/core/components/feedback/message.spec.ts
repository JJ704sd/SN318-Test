import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import {
  IconCheck,
  IconClose,
  IconExclamation,
  IconInfo,
} from '@arco-design/web-vue/es/icon/index.js'
import { Message } from '@arco-design/web-vue'
import { errorMsg, infoMsg, successMsg, warningMsg } from './message'

vi.mock('@arco-design/web-vue', () => ({
  Message: {
    success: vi.fn<(cfg: CapturedToastConfig) => void>(),
    warning: vi.fn<(cfg: CapturedToastConfig) => void>(),
    error: vi.fn<(cfg: CapturedToastConfig) => void>(),
    info: vi.fn<(cfg: CapturedToastConfig) => void>(),
  },
}))

interface CapturedToastConfig {
  content: string
  duration: number
  position: string
  icon: () => VNode
}

const successMock = vi.mocked(Message.success)
const warningMock = vi.mocked(Message.warning)
const errorMock = vi.mocked(Message.error)
const infoMock = vi.mocked(Message.info)

const ALL_MESSAGE_MOCKS = [successMock, warningMock, errorMock, infoMock]

/** 取出某类型最近一次配置，并执行其 icon 渲染函数以覆盖 renderToastIcon/h 分支。 */
function lastConfig(mock: typeof successMock): CapturedToastConfig {
  const cfg = mock.mock.calls.at(-1)?.[0] as CapturedToastConfig
  cfg.icon() // 覆盖 renderToastIcon 内部 h 分支点
  return cfg
}

describe('feedback.message 四类轻提示', () => {
  afterEach(() => {
    ALL_MESSAGE_MOCKS.forEach((m) => m.mockClear())
  })

  it('successMsg 分发到 Message.success 且图标为勾', () => {
    successMsg('已保存')
    const cfg = lastConfig(successMock)
    expect(cfg).toMatchObject({ content: '已保存', duration: 3000, position: 'top' })
    const iconRoot = cfg.icon() as VNode
    expect((iconRoot.children as VNode[])[0].type).toBe(IconCheck)
  })

  it('warningMsg 分发到 Message.warning 且图标为叹号', () => {
    warningMsg('有警告')
    const cfg = lastConfig(warningMock)
    expect(cfg.content).toBe('有警告')
    const iconRoot = cfg.icon() as VNode
    expect((iconRoot.children as VNode[])[0].type).toBe(IconExclamation)
  })

  it('errorMsg 分发到 Message.error 且图标为叉号', () => {
    errorMsg('已失败')
    const cfg = lastConfig(errorMock)
    expect(cfg.content).toBe('已失败')
    const iconRoot = cfg.icon() as VNode
    expect((iconRoot.children as VNode[])[0].type).toBe(IconClose)
  })

  it('infoMsg 分发到 Message.info 且图标为信息', () => {
    infoMsg('提示信息')
    const cfg = lastConfig(infoMock)
    expect(cfg.content).toBe('提示信息')
    const iconRoot = cfg.icon() as VNode
    expect((iconRoot.children as VNode[])[0].type).toBe(IconInfo)
  })
})
