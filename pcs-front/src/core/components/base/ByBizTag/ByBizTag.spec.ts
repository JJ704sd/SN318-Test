import { mount } from '@vue/test-utils'
import { afterEach, describe, it, expect, vi } from 'vitest'
import ByBizTag from './ByBizTag.vue'

const BIZ_TYPES = ['express', 'air', 'fba', 'line', 'sea', 'pickup', 'inquiry'] as const

const BIZ_LABELS = {
  express: '快递',
  air: '空运',
  fba: 'FBA',
  line: '国际专线',
  sea: '海运整柜',
  pickup: '上门取件',
  inquiry: '在线询盘',
} as const

/** stub CSS.supports：returns 按 property/value 判定；默认 true。 */
function stubSupports(matcher?: (property: string, value: string) => boolean) {
  vi.stubGlobal('CSS', {
    supports: (property: string, value: string) => (matcher ? matcher(property, value) : true),
  })
}

describe('ByBizTag', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(BIZ_TYPES)('type=%s 使用对应业务色 class', (type) => {
    const wrapper = mount(ByBizTag, { props: { type } })
    expect(wrapper.find('.by-biz-tag').classes()).toContain(`by-biz-tag--${type}`)
  })

  it('预设 type 无自定义色时不产生内联 style', () => {
    const wrapper = mount(ByBizTag, { props: { type: 'express' } })
    expect(wrapper.find('.by-biz-tag').attributes('style')).toBeUndefined()
  })

  it('7 种类型均有默认中文文案', () => {
    BIZ_TYPES.forEach((type) => {
      const wrapper = mount(ByBizTag, { props: { type } })
      expect(wrapper.text()).toBe(BIZ_LABELS[type])
    })
  })

  it('size=small 时有 small class', () => {
    const wrapper = mount(ByBizTag, { props: { type: 'air', size: 'small' } })
    expect(wrapper.find('.by-biz-tag--small').exists()).toBe(true)
  })

  it('slot 可覆盖默认文案', () => {
    const wrapper = mount(ByBizTag, {
      props: { type: 'sea' },
      slots: { default: '自定义' },
    })
    expect(wrapper.text()).toBe('自定义')
  })

  it('label 覆盖默认文案（无 slot 时）', () => {
    const wrapper = mount(ByBizTag, { props: { type: 'sea', label: '走海派' } })
    expect(wrapper.text()).toBe('走海派')
  })

  it('文字优先级 slot > label > type 默认', () => {
    const wrapper = mount(ByBizTag, {
      props: { type: 'sea', label: 'label 文案' },
      slots: { default: 'slot 文案' },
    })
    expect(wrapper.text()).toBe('slot 文案')
  })

  it('自定义 color/backgroundColor（CSS.supports 通过）注入受控 CSS 变量', () => {
    stubSupports()
    const wrapper = mount(ByBizTag, {
      props: { type: 'air', color: 'rgb(255, 0, 0)', backgroundColor: 'rgb(0, 255, 0)' },
    })
    const style = wrapper.find('.by-biz-tag').attributes('style') ?? ''
    expect(style).toContain('--by-tag-color: rgb(255, 0, 0)')
    expect(style).toContain('--by-tag-bg: rgb(0, 255, 0)')
  })

  it('非法自定义色（CSS.supports 拒绝）回落 type 预设、不注入变量', () => {
    stubSupports(() => false)
    const wrapper = mount(ByBizTag, {
      props: { type: 'express', color: 'rgb(oops)', backgroundColor: 'rgb(oops)' },
    })
    expect(wrapper.find('.by-biz-tag').attributes('style')).toBeUndefined()
    expect(wrapper.find('.by-biz-tag').classes()).toContain('by-biz-tag--express')
  })

  it('仅自定义 color 时只注入文字色变量', () => {
    stubSupports()
    const wrapper = mount(ByBizTag, { props: { type: 'fba', color: 'rgb(1, 2, 3)' } })
    const style = wrapper.find('.by-biz-tag').attributes('style') ?? ''
    expect(style).toContain('--by-tag-color: rgb(1, 2, 3)')
    expect(style).not.toContain('--by-tag-bg')
  })
})
