import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { Button as AButton } from '@arco-design/web-vue'
import AiStatusIndicator from './AiStatusIndicator.vue'
import { useAiStore, type AiStatus } from '@core/ai/store'

// 隔离服务：仅创建 store，不触发真实 AI 请求（本组件只读 status，不调这些方法）
const { mockService } = vi.hoisted(() => ({
  mockService: {
    sendMessage: vi.fn<() => Promise<never>>(),
    requestSuggestions: vi.fn<() => Promise<never>>(),
    confirmAndExecute: vi.fn<() => Promise<never>>(),
  },
}))
vi.mock('@core/ai/service', () => ({ getAiService: () => mockService }))

// 子视觉组件全部 stub：本组件是「映射总控」，只验证按 status 选对了哪个子件 + 文案 + emit
const stubs = {
  AiActiveContainer: {
    template:
      '<div class="active-stub" :data-flowing="String(flowing)"><slot name="action" /><slot /></div>',
    props: ['flowing'],
  },
  AiThinkingDots: { template: '<span class="dots-stub" />' },
  AiStreamCursor: { template: '<span class="cursor-stub" />' },
  AiPingWave: { template: '<span class="ping-stub" />' },
  AiTag: { template: '<span class="ai-tag-stub">{{ text }}</span>', props: ['text', 'size'] },
}

function mountIndicator(status: AiStatus, patch?: Partial<Record<string, unknown>>) {
  const store = useAiStore()
  store.status = status
  if (patch) Object.assign(store, patch)
  const wrapper = mount(AiStatusIndicator, { global: { components: { AButton }, stubs } })
  return { store, wrapper }
}

describe('AiStatusIndicator', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('渲染可见性', () => {
    it('idle 不渲染', () => {
      const { wrapper } = mountIndicator('idle')
      expect(wrapper.find('.ai-status').exists()).toBe(false)
    })

    it('awaitingUser 不渲染（由 AiActionBar 承载）', () => {
      const { wrapper } = mountIndicator('awaitingUser')
      expect(wrapper.find('.ai-status').exists()).toBe(false)
    })
  })

  describe('生成链路', () => {
    it('requesting：中性灰波纹、无流光、文案「正在连接…」、右上角取消', () => {
      const { wrapper } = mountIndicator('requesting')
      expect(wrapper.find('.ping-stub').exists()).toBe(true)
      expect(wrapper.find('.dots-stub').exists()).toBe(false)
      // requesting 走进行态容器但不加流光
      expect(wrapper.find('.active-stub').attributes('data-flowing')).toBe('false')
      expect(wrapper.find('.ai-status__label').text()).toBe('正在连接…')
      expect(wrapper.find('.ai-status__anchor-btn').text()).toBe('取消')
    })

    it('thinking：三点脉冲 + 流光 + 文案，右上角停止', () => {
      const { wrapper } = mountIndicator('thinking')
      expect(wrapper.find('.dots-stub').exists()).toBe(true)
      expect(wrapper.find('.active-stub').attributes('data-flowing')).toBe('true')
      expect(wrapper.find('.ai-status__label').text()).toBe('运小星正在分析…')
      expect(wrapper.find('.ai-status__anchor-btn').text()).toBe('停止')
    })

    it('streaming：末尾光标 + 流光', () => {
      const { wrapper } = mountIndicator('streaming')
      expect(wrapper.find('.cursor-stub').exists()).toBe(true)
      expect(wrapper.find('.active-stub').attributes('data-flowing')).toBe('true')
      expect(wrapper.find('.ai-status__anchor-btn').text()).toBe('停止')
    })

    it('done：内容静止 + 「AI 建议」角标，无进行态容器', () => {
      const { wrapper } = mountIndicator('done')
      expect(wrapper.find('.active-stub').exists()).toBe(false)
      expect(wrapper.find('.ai-status__done').exists()).toBe(true)
      expect(wrapper.find('.ai-tag-stub').text()).toBe('AI 建议')
    })
  })

  describe('任务链路', () => {
    it('executing：优先读 execProgress 作为主文案 + 流光', () => {
      const { wrapper } = mountIndicator('executing', {
        execProgress: '正在查询运单…第 2/3 步',
      })
      expect(wrapper.find('.active-stub').attributes('data-flowing')).toBe('true')
      expect(wrapper.find('.ai-status__label').text()).toBe('正在查询运单…第 2/3 步')
    })

    it('executing：无 execProgress 时回落 activeTool', () => {
      const { wrapper } = mountIndicator('executing', { activeTool: 'queryWaybill' })
      expect(wrapper.find('.ai-status__label').text()).toBe('queryWaybill')
    })
  })

  describe('异常链路', () => {
    it('aborted：中性「已停止」角标，未使用 error 红色面板', () => {
      const { wrapper } = mountIndicator('aborted')
      expect(wrapper.find('.ai-status__panel--neutral').exists()).toBe(true)
      expect(wrapper.find('.ai-status__panel--error').exists()).toBe(false)
      expect(wrapper.find('.ai-status__badge').text()).toBe('已停止')
    })

    it('timeoutNetwork：error 面板 + 文案「网络连接异常」+ 「检查网络后重试」', () => {
      const { wrapper } = mountIndicator('timeoutNetwork')
      expect(wrapper.find('.ai-status__panel--error').exists()).toBe(true)
      expect(wrapper.find('.ai-status__error-text').text()).toBe('网络连接异常')
      expect(wrapper.find('.ai-status__footer button').text()).toBe('检查网络后重试')
    })

    it('timeoutServer：沿用思考中活跃态（流光 + 三点脉冲），底部继续等待/停止、不引导重试', () => {
      const { wrapper } = mountIndicator('timeoutServer')
      expect(wrapper.find('.dots-stub').exists()).toBe(true)
      expect(wrapper.find('.active-stub').attributes('data-flowing')).toBe('true')
      const footerBtns = wrapper.findAll('.ai-status__footer button')
      expect(footerBtns.map((b) => b.text())).toEqual(['继续等待', '停止'])
      // 服务器超时不出现「重新生成 / 检查网络」等重试入口
      expect(wrapper.text()).not.toContain('重新生成')
      expect(wrapper.text()).not.toContain('检查网络后重试')
    })

    it('timeoutModel：error 面板 + 「AI 响应超时，请稍后重试」+ 重新生成', () => {
      const { wrapper } = mountIndicator('timeoutModel')
      expect(wrapper.find('.ai-status__panel--error').exists()).toBe(true)
      expect(wrapper.find('.ai-status__error-text').text()).toBe('AI 响应超时，请稍后重试')
      expect(wrapper.find('.ai-status__footer button').text()).toBe('重新生成')
    })

    it('failed：读 errorReason 作为文案，不暴露堆栈', () => {
      const { wrapper } = mountIndicator('failed', { errorReason: '运单服务暂不可用' })
      expect(wrapper.find('.ai-status__error-text').text()).toBe('运单服务暂不可用')
    })

    it('failed：无 errorReason 时用兜底文案', () => {
      const { wrapper } = mountIndicator('failed')
      expect(wrapper.find('.ai-status__error-text').text()).toBe('AI 处理失败，请稍后重试')
    })
  })

  describe('后续动作仅 emit、组件不触发执行', () => {
    it('requesting 取消 → emit(cancel)', async () => {
      const { wrapper } = mountIndicator('requesting')
      await wrapper.find('.ai-status__anchor-btn').trigger('click')
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('thinking 停止 → emit(stop)', async () => {
      const { wrapper } = mountIndicator('thinking')
      await wrapper.find('.ai-status__anchor-btn').trigger('click')
      expect(wrapper.emitted('stop')).toHaveLength(1)
    })

    it('aborted 继续 → emit(resume)，重新生成 → emit(regenerate)', async () => {
      const { wrapper } = mountIndicator('aborted')
      const btns = wrapper.findAll('.ai-status__footer button')
      await btns[0]!.trigger('click')
      await btns[1]!.trigger('click')
      expect(wrapper.emitted('resume')).toHaveLength(1)
      expect(wrapper.emitted('regenerate')).toHaveLength(1)
      // 「继续」不复用 retry，与网络超时的重试语义区分
      expect(wrapper.emitted('retry')).toBeUndefined()
    })

    it('timeoutNetwork 检查网络后重试 → emit(retry)', async () => {
      const { wrapper } = mountIndicator('timeoutNetwork')
      await wrapper.find('.ai-status__footer button').trigger('click')
      expect(wrapper.emitted('retry')).toHaveLength(1)
    })

    it('timeoutServer 继续等待 → emit(keepWaiting)，停止 → emit(stop)', async () => {
      const { wrapper } = mountIndicator('timeoutServer')
      const btns = wrapper.findAll('.ai-status__footer button')
      await btns[0]!.trigger('click')
      await btns[1]!.trigger('click')
      expect(wrapper.emitted('keepWaiting')).toHaveLength(1)
      expect(wrapper.emitted('stop')).toHaveLength(1)
    })

    it('timeoutModel / failed 重新生成 → emit(regenerate)', async () => {
      const { wrapper } = mountIndicator('timeoutModel')
      await wrapper.find('.ai-status__footer button').trigger('click')
      expect(wrapper.emitted('regenerate')).toHaveLength(1)
    })
  })
})
