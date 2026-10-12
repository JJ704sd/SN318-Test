import { describe, it, expect } from 'vitest'
import {
  getDashboardStats,
  getDetail,
  getDrawerDetail,
  getList,
  submitForm,
} from './demo'

describe('demo API（mock 假数据契约）', () => {
  it('getList：分页返回 list/total/page/pageSize，且 list 长度不超过 pageSize', async () => {
    const res = await getList({ page: 1, pageSize: 10 })
    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(10)
    expect(res.list.length).toBeLessThanOrEqual(10)
    expect(res.total).toBeGreaterThan(0)
  })

  it('getList：按 status 过滤，返回结果全部匹配该状态', async () => {
    const res = await getList({ page: 1, pageSize: 50, status: 'exception' })
    expect(res.list.every((item) => item.status === 'exception')).toBe(true)
  })

  it('getList：按 keyword 匹配运单号或客户名，无匹配时返回空列表', async () => {
    const res = await getList({ page: 1, pageSize: 10, keyword: '不存在的关键词xyz' })
    expect(res.list).toHaveLength(0)
    expect(res.total).toBe(0)
  })

  it('getDetail：返回完整详情，含 traces 时间线', async () => {
    const detail = await getDetail('wb-1')
    expect(detail.id).toBe('wb-1')
    expect(detail.traces.length).toBeGreaterThan(0)
  })

  it('getDrawerDetail：返回精简详情（无 traces 字段）', async () => {
    const detail = await getDrawerDetail('wb-1')
    expect(detail.id).toBe('wb-1')
    expect('traces' in detail).toBe(false)
  })

  it('submitForm：提交后返回 id + waybillNo', async () => {
    const res = await submitForm({
      bizType: 'express',
      destination: '美国·洛杉矶',
      consignee: '测试客户',
      consigneePhone: '13800000000',
      shipDate: '2026-07-23',
      weight: 1.5,
      amount: 100,
      insured: false,
    })
    expect(res.id).toBeTruthy()
    expect(res.waybillNo).toBeTruthy()
  })

  it('getDashboardStats：统计字段与 7 日趋势齐全', async () => {
    const stats = await getDashboardStats()
    expect(stats.totalWaybills).toBeGreaterThan(0)
    expect(stats.trend).toHaveLength(7)
  })
})
