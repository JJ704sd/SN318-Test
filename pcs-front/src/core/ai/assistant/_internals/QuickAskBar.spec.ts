import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import QuickAskBar from './QuickAskBar.vue'

function mountBar(props: Record<string, unknown> = {}) {
  return mount(QuickAskBar, { props })
}

describe('QuickAskBar', () => {
  it('a) items 为空不渲染', () => {
    const wrapper = mountBar()
    expect(wrapper.find('.quick-ask').exists()).toBe(false)
  })

  it('b) 每个 item 渲染一个胶囊按钮', () => {
    const wrapper = mountBar({ items: ['查运单', '生成报表'] })
    const pills = wrapper.findAll('.quick-ask__pill')
    expect(pills).toHaveLength(2)
    expect(pills[0]!.text()).toBe('查运单')
  })

  it('c) 点击胶囊 emit ask 携带对应文案', async () => {
    const wrapper = mountBar({ items: ['查运单', '生成报表'] })
    await wrapper.findAll('.quick-ask__pill')[1]!.trigger('click')
    expect(wrapper.emitted('ask')).toBeTruthy()
    expect(wrapper.emitted('ask')![0]).toEqual(['生成报表'])
  })

  it('d) disabled 时按钮禁用', () => {
    const wrapper = mountBar({ items: ['查运单'], disabled: true })
    expect(wrapper.find('.quick-ask__pill').attributes('disabled')).toBeDefined()
  })

  it('e) 对象项使用 label 展示、value 上抛，并支持单项禁用', async () => {
    const wrapper = mountBar({
      items: [
        { label: '请求中', value: 'preview:requesting' },
        { label: '普通提问', value: 'ask:normal', disabled: true },
      ],
    })
    const pills = wrapper.findAll('.quick-ask__pill')

    expect(pills[0]!.text()).toBe('请求中')
    await pills[0]!.trigger('click')
    expect(wrapper.emitted('ask')![0]).toEqual(['preview:requesting'])
    expect(pills[1]!.attributes('disabled')).toBeDefined()
  })
})
