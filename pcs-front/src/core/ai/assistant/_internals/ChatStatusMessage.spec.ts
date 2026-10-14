import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Button as AButton } from '@arco-design/web-vue'
import ChatStatusMessage from './ChatStatusMessage.vue'
import source from './ChatStatusMessage.vue?raw'

const stubs = {
  AiAvatar: true,
  AiPingWave: true,
  AiThinkingDots: true,
  SvgIcon: true,
  'icon-refresh': true,
  'icon-tool': true,
}

function mountStatus(status: Parameters<typeof ChatStatusMessage>[0]['status']) {
  return mount(ChatStatusMessage, {
    props: {
      status,
      partialContent: '已找到 12 条相关运单，其中 3 条超时。',
      errorReason: '服务暂时不可用，请稍后重试。',
      execProgress: '正在查询运单轨迹…第 2 / 3 步',
    },
    global: { components: { AButton }, stubs },
  })
}

describe('ChatStatusMessage', () => {
  it('状态气泡左上角统一为直角', () => {
    for (const selector of [
      '.chat-status__typing',
      '.chat-status__tool-step',
      '.chat-status__bubble',
    ]) {
      const escapedSelector = selector.replace('.', '\\.')
      expect(source).toMatch(
        new RegExp(
          `${escapedSelector}\\s*\\{[^}]*border-radius:\\s*0 var\\(--border-radius-card\\) var\\(--border-radius-card\\)`,
        ),
      )
    }
  })

  it('a) 请求中显示灰色连接波纹与建立连接文案', () => {
    const wrapper = mountStatus('requesting')
    expect(wrapper.find('.chat-status__connection').text()).toContain('正在建立连接')
  })

  it('b) 思考中显示三点打字气泡', () => {
    const wrapper = mountStatus('thinking')
    expect(wrapper.find('.chat-status__typing').exists()).toBe(true)
  })

  it('c) 执行中显示工具步骤文案', () => {
    const wrapper = mountStatus('executing')
    expect(wrapper.find('.chat-status__tool-step').text()).toContain('第 2 / 3 步')
    expect(wrapper.find('.chat-status__tool-icon').exists()).toBe(true)
    expect(source).toMatch(/\.chat-status__tool-step\s*\{[^}]*border:\s*2px solid transparent/)
    expect(source).toMatch(/linear-gradient\(\s*110deg,\s*rgb\(4 110 252 \/ 34%\)/)
    expect(source).toMatch(/animation-duration:\s*var\(--duration-ai-execution-flow\)/)
    expect(source).toMatch(
      /@keyframes borderFlow\s*\{\s*100%\s*\{\s*background-position:\s*0 0,\s*220% 0/,
    )
  })

  it('d) 中断保留断点内容，并能继续或重新生成', async () => {
    const wrapper = mountStatus('aborted')
    expect(wrapper.find('.chat-status__stopped').text()).toBe('已停止')
    expect(wrapper.find('.chat-status__bubble').text()).toContain('已找到 12 条')
    await wrapper.findAll('.chat-status__actions button')[0]!.trigger('click')
    expect(wrapper.emitted('resume')).toHaveLength(1)
  })

  it('e) 网络超时展示错误气泡，操作为检查网络后重试', async () => {
    const wrapper = mountStatus('timeoutNetwork')
    expect(wrapper.find('.chat-status__bubble--error').text()).toContain('网络连接异常')
    await wrapper.find('.chat-status__actions button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('f) 服务端超时保持思考态，并提供继续等待与停止', async () => {
    const wrapper = mountStatus('timeoutServer')
    expect(wrapper.find('.chat-status__typing').exists()).toBe(true)
    expect(wrapper.find('.chat-status__hint').text()).toContain('仍在处理')
    expect(wrapper.find('.chat-status__stop-icon').exists()).toBe(true)
    await wrapper.findAll('.chat-status__actions button')[0]!.trigger('click')
    expect(wrapper.emitted('keepWaiting')).toHaveLength(1)
  })

  it('g) 模型超时提供重新生成，不展示技术错误', async () => {
    const wrapper = mountStatus('timeoutModel')
    expect(wrapper.find('.chat-status__bubble--error').text()).toBe('AI 响应超时，请稍后重试。')
    await wrapper.find('.chat-status__actions button').trigger('click')
    expect(wrapper.emitted('regenerate')).toHaveLength(1)
  })
})
