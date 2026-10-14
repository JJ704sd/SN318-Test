import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Button as AButton } from '@arco-design/web-vue'
import ChatSuggestionActions from './ChatSuggestionActions.vue'

describe('ChatSuggestionActions', () => {
  it('按完成态规范提供采纳建议与忽略操作', async () => {
    const wrapper = mount(ChatSuggestionActions, {
      global: { components: { AButton }, stubs: { 'icon-check': true } },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['采纳建议', '忽略'])
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('accept')).toHaveLength(1)
    expect(wrapper.emitted('ignore')).toHaveLength(1)
  })
})
