import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ByEmpty from './ByEmpty.vue'

const PRESET_TITLES = {
  noData: '暂无数据',
  noResult: '未找到相关结果',
  noAuth: '暂无访问权限',
  error: '加载失败',
} as const

describe('ByEmpty', () => {
  it.each([
    ['noData', PRESET_TITLES.noData],
    ['noResult', PRESET_TITLES.noResult],
    ['noAuth', PRESET_TITLES.noAuth],
    ['error', PRESET_TITLES.error],
  ] as const)('preset=%s 显示对应标题', (preset, expectedTitle) => {
    const wrapper = mount(ByEmpty, { props: { preset } })
    expect(wrapper.find('.by-empty__title').text()).toBe(expectedTitle)
  })

  it('noResult / noAuth 显示说明文案', () => {
    const noResult = mount(ByEmpty, { props: { preset: 'noResult' } })
    expect(noResult.find('.by-empty__desc').text()).toBe('请调整筛选条件后重试')

    const noAuth = mount(ByEmpty, { props: { preset: 'noAuth' } })
    expect(noAuth.find('.by-empty__desc').text()).toBe('请联系管理员开通')
  })

  it('noData 默认无说明文案', () => {
    const wrapper = mount(ByEmpty, { props: { preset: 'noData' } })
    expect(wrapper.find('.by-empty__desc').exists()).toBe(false)
  })

  it('自定义 title/description 覆盖 preset', () => {
    const wrapper = mount(ByEmpty, {
      props: { preset: 'noData', title: '自定义标题', description: '自定义描述' },
    })
    expect(wrapper.find('.by-empty__title').text()).toBe('自定义标题')
    expect(wrapper.find('.by-empty__desc').text()).toBe('自定义描述')
  })

  it('action 插槽有内容才渲染操作区', () => {
    const wrapperNoAction = mount(ByEmpty, { props: { preset: 'noAuth' } })
    expect(wrapperNoAction.find('.by-empty__action').exists()).toBe(false)

    const wrapperWithAction = mount(ByEmpty, {
      props: { preset: 'noData' },
      slots: { action: '<button>新增运单</button>' },
    })
    expect(wrapperWithAction.find('.by-empty__action').exists()).toBe(true)
  })
})
