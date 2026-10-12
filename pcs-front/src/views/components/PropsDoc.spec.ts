import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PropsDoc from './PropsDoc.vue'
import type { PropDocGroup } from './propDoc'

vi.mock('@baiyun/template-core/components', () => ({
  ByCard: {
    name: 'ByCard',
    props: ['title', 'variant'],
    template: '<section data-test="card"><h2>{{ title }}</h2><slot /></section>',
  },
}))

const GROUPS: PropDocGroup[] = [
  {
    title: 'DemoComp',
    note: '分组说明',
    rows: [
      { name: 'title', type: 'string', required: true, desc: '标题' },
      { name: 'size', type: "'s' | 'm'", default: "'m'", desc: '尺寸' },
    ],
  },
]

describe('PropsDoc', () => {
  it('默认标题为「可传递参数」，并渲染参数行', () => {
    const wrapper = mount(PropsDoc, { props: { groups: GROUPS } })

    expect(wrapper.text()).toContain('可传递参数')
    expect(wrapper.text()).toContain('DemoComp')
    expect(wrapper.text()).toContain('分组说明')
    expect(wrapper.text()).toContain('title')
    expect(wrapper.text()).toContain('必填')
    expect(wrapper.text()).toContain('string')
    expect(wrapper.text()).toContain('标题')
    expect(wrapper.text()).toContain("'m'")
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('无默认值时显示破折号', () => {
    const wrapper = mount(PropsDoc, { props: { groups: GROUPS } })
    const firstRow = wrapper.findAll('tbody tr')[0]
    expect(firstRow?.text()).toContain('—')
  })

  it('支持自定义卡片标题', () => {
    const wrapper = mount(PropsDoc, {
      props: { groups: GROUPS, title: 'API' },
    })
    expect(wrapper.text()).toContain('API')
    expect(wrapper.text()).not.toContain('可传递参数')
  })
})
