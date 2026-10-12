import { describe, it, expect } from 'vitest'
import source from './DetailDrawerContent.biz.vue?raw'

describe('DetailDrawerContent 分组区间距', () => {
  it('分组区相对上方卡片再上移 8px，内部子卡片间距 16px', () => {
    const root = source.match(/\.drawer-detail\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(root).toMatch(/gap:\s*var\(--spacing-lg\)/)

    const groups = source.match(/\.drawer-detail__groups\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(groups).toMatch(/margin-top:\s*calc\(var\(--spacing-sm\)\s*\*\s*-1\)/)
    expect(groups).toMatch(/width:\s*calc\(100% \+ var\(--grid-gutter\)\)/)
    expect(groups).not.toMatch(/margin-top:\s*-16px/)
    expect(source).not.toContain('calc(100% + 8px)')

    const stack = source.match(/\.drawer-detail__stack\s*\{(?<body>[\s\S]*?)\n\}/)?.groups?.body ?? ''
    expect(stack).toMatch(/gap:\s*var\(--spacing-md\)/)
    expect(source).toMatch(/:gutter="\[16,\s*16\]"/)
  })
})