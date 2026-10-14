import { describe, expect, it } from 'vitest'
import { ERROR_TEXT, HTTP_CODE_MAP, resolveHttpMeta } from './errorCode'

describe('errorCode http 状态码分流', () => {
  it('精确命中映射表的代码返回其类别与缺省文案', () => {
    expect(resolveHttpMeta(400)).toEqual({ kind: 'business', text: ERROR_TEXT.business })
    expect(resolveHttpMeta(401)).toEqual({ kind: 'permission', text: ERROR_TEXT.permission })
    expect(resolveHttpMeta(403)).toEqual({ kind: 'permission', text: ERROR_TEXT.permission })
    expect(resolveHttpMeta(404)).toEqual({ kind: 'system', text: '请求的资源不存在' })
    expect(resolveHttpMeta(500)).toEqual({ kind: 'system', text: ERROR_TEXT.system })
  })

  it('未精确命中时按 5xx=系统、其他 4xx=业务回落', () => {
    // 5xx 段落（502/599 等）
    expect(resolveHttpMeta(502).kind).toBe('system')
    expect(resolveHttpMeta(599).kind).toBe('system')
    // 4xx 且不在映射表（如 422）
    expect(resolveHttpMeta(422)).toEqual({ kind: 'business', text: ERROR_TEXT.business })
    // 2xx / 3xx（不在错误档）一律回落到系统兜底
    expect(resolveHttpMeta(200).kind).toBe('system')
    expect(resolveHttpMeta(302).kind).toBe('system')
  })

  it('HTTP_CODE_MAP 枚举与 ERROR_TEXT 文案对齐', () => {
    expect(HTTP_CODE_MAP['400'].kind).toBe('business')
    expect(HTTP_CODE_MAP['500'].kind).toBe('system')
    expect(ERROR_TEXT.system).toContain('系统')
    expect(ERROR_TEXT.network).toContain('网络')
    expect(ERROR_TEXT.permission).toContain('权限')
  })
})
