import { describe, expect, it } from 'vitest'
import { pickNlFilterSuggestion } from './nl-filter'
import type { AiSuggestion } from '../types'

describe('pickNlFilterSuggestion', () => {
  function suggestion(text: string): AiSuggestion | undefined {
    return pickNlFilterSuggestion(text)[0]
  }

  function payload(text: string): Record<string, unknown> {
    const s = suggestion(text)
    expect(s).toBeDefined()
    return { ...(s!.action.payload as Record<string, unknown>) }
  }

  it('空白文本：返回空建议（!trimmed 分支）', () => {
    expect(pickNlFilterSuggestion('')).toEqual([])
    expect(pickNlFilterSuggestion('   ')).toEqual([])
  })

  it('识别业务类型 + 状态 + 无识别字段不进 evidence', () => {
    const s = suggestion('帮我查空运异常单')!
    const p = s.action.payload as { bizType?: string; status?: string; keyword?: string }
    expect(p.bizType).toBe('air')
    expect(p.status).toBe('exception')
    expect(p.keyword).toBeUndefined()
    expect(s.description).toContain('空运')
    expect(s.description).toContain('异常')
    const tags = s.evidence.map((e) => `${e.label}:${e.value}`)
    expect(tags).toContain('业务类型:空运')
    expect(tags).toContain('状态:异常')
    // 既无日期也无关键词，evidence 不含时间范围/关键词
    expect(tags.some((t) => t.includes('时间范围'))).toBe(false)
    expect(tags.some((t) => t.includes('关键词'))).toBe(false)
  })

  it('近 30 天日期分支：condition 携带 dateRange、evidence 含时间范围', () => {
    const s = suggestion('近30天快递运输中')!
    const p = payload('近30天快递运输中')
    expect(p.bizType).toBe('express')
    expect(p.status).toBe('in_transit')
    expect(Array.isArray(p.dateRange)).toBe(true)
    expect((p.dateRange as [string, string])[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(s.description).toContain('近 30 天')
    expect(s.evidence.map((e) => e.label)).toContain('时间范围')
  })

  it('最近一个月与上周日期分支', () => {
    expect(suggestion('最近一个月')!.description).toContain('近 30 天')
    expect(suggestion('上周')!.description).toContain('上周')
  })

  it('仅有状态识别：不进关键词兜底', () => {
    const p = payload('只看已签收的运单')
    expect(p).toMatchObject({ status: 'delivered' })
    expect(p.keyword).toBeUndefined()
  })

  it('未识别任何字段：整句作为关键词兜底并进 evidence', () => {
    const s = suggestion('单号 BY20260916')!
    const p = s.action.payload as { keyword?: string }
    expect(p.keyword).toBe('单号 BY20260916')
    expect(s.description).toContain('关键词')
    expect(s.evidence.map((e) => e.label)).toContain('关键词')
  })

  it('海运/在途、已投递等其他映射', () => {
    expect(payload('海运在途运单')).toMatchObject({ bizType: 'sea', status: 'in_transit' })
    expect(payload('已投递的快递')).toMatchObject({ bizType: 'express', status: 'delivered' })
  })

  it('返回结构约定（风险等级、action 载荷）', () => {
    const s = suggestion('空运')!
    expect(s.id).toBe('sg-nl-filter')
    expect(s.riskLevel).toBe('low')
    expect(s.action.type).toBe('apply-filter')
    expect(s.action.requireConfirm).toBe(false)
  })
})
