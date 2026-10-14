import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AiThinkingDots from './AiThinkingDots.vue'
import source from './AiThinkingDots.vue?raw'

describe('AiThinkingDots', () => {
  it('渲染三个固定尺寸、错峰上跳的脉冲圆点', () => {
    const wrapper = mount(AiThinkingDots)

    expect(wrapper.findAll('.ai-thinking-dots__dot')).toHaveLength(3)
    expect(source).toMatch(/animation-name:\s*pulse/)
    expect(source).toMatch(/opacity:\s*0\.35/)
    expect(source).toMatch(/transform:\s*translateY\(-3px\)/)
    expect(source).not.toMatch(/transform:[^;]*scale/)
    expect(source).toMatch(/\.ai-thinking-dots__dot:nth-child\(2\)/)
    expect(source).toMatch(/\.ai-thinking-dots__dot:nth-child\(3\)/)
  })

  it('减少动态效果时关闭动画', () => {
    expect(source).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
    expect(source).toMatch(/animation:\s*none/)
  })
})
