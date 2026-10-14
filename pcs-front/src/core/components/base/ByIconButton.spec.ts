import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Tooltip as ATooltip } from '@arco-design/web-vue'
import ByIconButton from './ByIconButton.vue'

describe('ByIconButton', () => {
  it('可隐藏可视 Tooltip 并保留按钮无障碍名称', () => {
    const wrapper = mount(ByIconButton, {
      props: { tooltip: '打开菜单', showTooltip: false },
    })

    expect(wrapper.findComponent(ATooltip).props('disabled')).toBe(true)
    expect(wrapper.find('button').attributes('aria-label')).toBe('打开菜单')
  })
})
