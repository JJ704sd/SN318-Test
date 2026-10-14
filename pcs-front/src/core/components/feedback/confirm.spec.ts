import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VNode } from 'vue'
import {
  IconExclamationCircleFill,
  IconInfoCircleFill,
} from '@arco-design/web-vue/es/icon/index.js'
import { Modal } from '@arco-design/web-vue'
import { confirmAction } from './confirm'

vi.mock('@arco-design/web-vue', () => ({
  Modal: { open: vi.fn<(config: CapturedModalConfig) => void>() },
}))

interface CapturedModalConfig {
  hideTitle: boolean
  content: () => VNode
  okText?: string
  cancelText?: string
  okButtonProps?: { status?: string }
  onOk?: () => void
  onCancel?: () => void
}

const mockedOpen = vi.mocked(Modal.open)

function lastConfig(): CapturedModalConfig {
  return mockedOpen.mock.calls.at(-1)?.[0] as CapturedModalConfig
}

describe('confirm.confirmAction', () => {
  afterEach(() => {
    mockedOpen.mockReset()
  })

  it('默认非危险场景 icon 用 info 图标与 info 色', () => {
    const promise = confirmAction({ title: '标题', content: '正文' })
    const cfg = lastConfig()

    expect(cfg.hideTitle).toBe(true)
    // content 渲染函数执行到 icon 三元两个分支：非危险 → IconInfoCircleFill
    const root = cfg.content() as VNode
    const icon = (root.children as VNode[])[0]
    expect(icon.type).toBe(IconInfoCircleFill)
    // 三元语义色使用 info 变量
    expect((icon.props as { style: Record<string, string> }).style.color).toBe('var(--color-info)')
    // okText ?? (danger ? '确认删除' : '确认') 走非危险分支 '确认'
    expect(cfg.okText).toBe('确认')
    expect(cfg.okButtonProps).toBeUndefined()

    expect(promise).toBeInstanceOf(Promise)
  })

  it('危险场景 icon 用 warning 图标、error 色、确认删除文案与 danger 按钮', () => {
    confirmAction({ title: '标题', content: '正文', danger: true })
    const cfg = lastConfig()

    const root = cfg.content() as VNode
    const icon = (root.children as VNode[])[0]
    expect(icon.type).toBe(IconExclamationCircleFill)
    expect((icon.props as { style: Record<string, string> }).style.color).toBe('var(--color-error)')
    expect(cfg.okText).toBe('确认删除')
    expect(cfg.okButtonProps).toEqual({ status: 'danger' })
  })

  it('显式 okText 走 ?? 已提供分支，覆盖里层三元不参与', () => {
    confirmAction({ title: '标题', content: '正文', okText: '保存' })
    expect(lastConfig().okText).toBe('保存')
  })

  it('显式 cancelText 走 ?? 已提供分支，缺省回落"取消"', () => {
    confirmAction({ title: '标题', content: '正文', cancelText: '关闭' })
    expect(lastConfig().cancelText).toBe('关闭')

    confirmAction({ title: '标题', content: '正文' })
    expect(lastConfig().cancelText).toBe('取消')
  })

  it('danger 为 false 显式传入时仍走非危险文案分支', () => {
    confirmAction({ title: '标题', content: '正文', danger: false })
    expect(lastConfig().okText).toBe('确认')
    expect(lastConfig().okButtonProps).toBeUndefined()
  })

  it('onOk 触发后 Promise resolve(true)', async () => {
    const promise = confirmAction({ title: '标题', content: '正文' })
    lastConfig().onOk?.()
    await expect(promise).resolves.toBe(true)
  })

  it('onCancel 触发后 Promise resolve(false)', async () => {
    const promise = confirmAction({ title: '标题', content: '正文' })
    lastConfig().onCancel?.()
    await expect(promise).resolves.toBe(false)
  })
})
