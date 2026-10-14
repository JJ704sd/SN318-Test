import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearCsrfToken, getCsrfToken, setCsrfToken } from './csrf'

/** 构造一个可读写的 document stub，cookie 属性同真实 document 一样可赋值。 */
function stubDocument(cookieValue = ''): { cookie: string } {
  const doc = { cookie: cookieValue }
  vi.stubGlobal('document', doc)
  return doc
}

function stubProtocol(protocol: string): void {
  vi.stubGlobal('window', { location: { protocol } })
}

afterEach(() => vi.unstubAllGlobals())

describe('getCsrfToken', () => {
  it('无 document（SSR）时返回空串', () => {
    vi.stubGlobal('document', undefined)
    expect(getCsrfToken()).toBe('')
  })

  it('读到匹配 cookie 时解码返回', () => {
    stubDocument('other=1; csrf-token=%E4%BD%A0%20%2B')
    expect(getCsrfToken()).toBe('你 +')
  })

  it('无匹配 cookie 时返回空串', () => {
    stubDocument('other=1')
    expect(getCsrfToken()).toBe('')
  })

  it('cookie 存在但值为空时返回空串', () => {
    stubDocument('csrf-token=')
    expect(getCsrfToken()).toBe('')
  })
})

describe('setCsrfToken', () => {
  it('无 document（SSR）时静默返回', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('window', { location: { protocol: 'https:' } })
    expect(() => setCsrfToken('abc')).not.toThrow()
  })

  it('空 token 时静默返回', () => {
    const doc = stubDocument('')
    setCsrfToken('')
    expect(doc.cookie).toBe('')
  })

  it('https 协议写入时带 Secure 标记', () => {
    const doc = stubDocument('')
    stubProtocol('https:')
    setCsrfToken('a=b')
    expect(doc.cookie).toContain('csrf-token=a%3Db')
    expect(doc.cookie).toContain('; Secure')
    expect(doc.cookie).toContain('SameSite=Lax')
  })

  it('http 协议写入时不带 Secure 标记', () => {
    const doc = stubDocument('')
    stubProtocol('http:')
    setCsrfToken('a=b')
    expect(doc.cookie).toContain('csrf-token=a%3Db')
    expect(doc.cookie).not.toContain('Secure')
  })
})

describe('clearCsrfToken', () => {
  it('无 document（SSR）时静默返回', () => {
    vi.stubGlobal('document', undefined)
    expect(() => clearCsrfToken()).not.toThrow()
  })

  it('写入 Max-Age=0 清除 cookie', () => {
    const doc = stubDocument('csrf-token=abc')
    clearCsrfToken()
    expect(doc.cookie).toContain('Max-Age=0')
    expect(doc.cookie).toContain('SameSite=Lax')
  })
})
