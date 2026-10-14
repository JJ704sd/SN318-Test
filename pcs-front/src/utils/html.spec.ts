import { describe, expect, it } from 'vitest'
import { escapeHtml, sanitizeHtml } from './html'

describe('escapeHtml 文本插值转义', () => {
  it('转义 HTML 敏感字符（& < > " \'）', () => {
    expect(escapeHtml('&<script>"\':')).toBe('&amp;&lt;script&gt;&quot;&#39;:')
  })

  it('无敏感字符时原样返回', () => {
    expect(escapeHtml('普通文本 123 a-b_c')).toBe('普通文本 123 a-b_c')
  })

  it('空字符串与纯标点安全返回', () => {
    expect(escapeHtml('')).toBe('')
    expect(escapeHtml('（粗体）★ 20%')).toBe('（粗体）★ 20%')
  })
})

describe('sanitizeHtml 富文本白名单清洗', () => {
  it('默认剥离 style/class/on* 事件与会话数据属性', () => {
    const out = sanitizeHtml('<p style="color:red" class="x" onclick="alert(1)">文案</p>')
    expect(out).not.toContain('style=')
    expect(out).not.toContain('class=')
    expect(out).not.toContain('onclick')
    expect(out).toContain('文案')
    expect(out).toContain('</p>')
  })

  it('剔除白名单外危险标签（script/iframe）', () => {
    const out = sanitizeHtml('<p>安全</p><script>alert(1)</script><iframe src="x"></iframe>')
    expect(out).toContain('安全')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('<iframe')
  })

  it('放行白名单内常规富文本标签', () => {
    const out = sanitizeHtml('<h2>标题</h2><ul><li>项</li></ul><blockquote>引用</blockquote>')
    expect(out).toContain('<h2')
    expect(out).toContain('<li>')
    expect(out).toContain('<blockquote>')
  })

  it('清除 javascript: 危险协议的 href', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">XSS</a>')
    const link = out.match(/<a[^>]*>/g)?.[0] ?? out
    expect(link).not.toContain('javascript:')
  })

  it('保留合法链接并剥离不可信属性', () => {
    const out = sanitizeHtml('<a href="https://example.com" onclick="steal()" data-x="y">跳转</a>')
    expect(out).toContain('https://example.com')
    expect(out).not.toContain('onclick')
  })

  it('allowInlineStyle=true 时保留 style 但仍剥离事件属性', () => {
    const out = sanitizeHtml('<p style="color:red" onclick="alert(1)">文案</p>', {
      allowInlineStyle: true,
    })
    expect(out).toContain('style=')
    expect(out).not.toContain('onclick')
  })
})
