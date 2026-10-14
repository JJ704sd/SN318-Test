import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { configureApiHandlers, createHttp, getHttp } from '@core/api'
import { createLmdRecord, deleteLmdRecord, listLmdRecords, updateLmdRecord } from './lmd'
import { installLmdMock } from '@/mock/lmd'
import { MASTER_DATA_CONFIGS } from '@/views/master-data/config'

let restore: () => void
beforeEach(() => {
  configureApiHandlers({ onError: () => {} })
  restore = installLmdMock(getHttp(), { development: true, enabled: true, delayMs: 0 })
})
afterEach(() => restore())

describe('主数据 UI Mock', () => {
  it('在没有 BFF 的情况下返回可分页的国家数据', async () => {
    const first = await listLmdRecords('countries', { page: 1, page_size: 20 })
    expect(first.list).toHaveLength(20)
    expect(first.total).toBeGreaterThan(20)
    expect(first.list[0]).toMatchObject({ code: 'CN', name: '中国', source: 'mock' })
  })

  it.each(Object.values(MASTER_DATA_CONFIGS))(
    '$title：数据、表单字段及增改删齐全',
    async (config) => {
      const result = await listLmdRecords(config.resource, { page: 1, page_size: 200 })
      const first = result.list[0]!
      expect(result.total).toBeGreaterThan(0)
      for (const field of config.fields.filter((field) => field.required)) {
        expect(first[field.key]).not.toBeUndefined()
        expect(first[field.key]).not.toBe('')
      }
      const payload = Object.fromEntries(
        config.fields.map((field) => [field.key, first[field.key]]),
      )
      if (payload.code) payload.code = `UI-${config.key}`
      if (config.resource === 'postal-codes') payload.postal_code = '518888'
      if (config.resource === 'air-region-countries') payload.country_id = 2
      if (config.resource === 'reference-zone-members') payload.member_id = 2
      if (config.resource === 'exchange-rates') {
        payload.effective_from = '2026-11-01'
        payload.effective_to = '2026-11-30'
      }
      const created = await createLmdRecord(config.resource, payload)
      const id = created[config.idField] as string | number
      const updated = await updateLmdRecord(config.resource, id, { status: 0 })
      expect(updated.status).toBe(0)
      expect(updated.version_no).toBe(2)
      if (config.allowDelete !== false) {
        await deleteLmdRecord(config.resource, id)
      }
      expect((await listLmdRecords(config.resource, { page: 1, page_size: 200 })).total).toBe(
        config.allowDelete === false ? result.total + 1 : result.total,
      )
    },
  )

  it('支持分页、空结果与停用状态筛选', async () => {
    const second = await listLmdRecords('countries', { page: 2, page_size: 20 })
    expect(second.list).toHaveLength(4)
    expect(second.list[0]?.code).toBe('ZA')
    expect((await listLmdRecords('countries', { keyword: '不存在的国家XYZ' })).total).toBe(0)
    const disabled = await listLmdRecords('countries', { status: 0 })
    expect(disabled.total).toBeGreaterThan(0)
    expect(disabled.list.every((record) => record.status === 0)).toBe(true)
  })

  it('支持上级地点联动及航线区域、Zone 的关系筛选', async () => {
    const provinces = await listLmdRecords('provinces', { country_id: 1 })
    expect(provinces.list.map((record) => record.name)).toEqual(['广东省', '浙江省'])
    expect(provinces.list[0]?.parent_path).toBe('中国')
    const cities = await listLmdRecords('cities', { country_id: 2, province_id: 102 })
    expect(cities.list.map((record) => record.name)).toEqual(['洛杉矶'])
    const countries = await listLmdRecords('air-region-countries', { air_region_id: 901 })
    expect(countries.list[0]?.country_name).toBe('中国')
    const members = await listLmdRecords('reference-zone-members', {
      zone_id: 1001,
      member_type: 'airport',
    })
    expect(members.list[0]?.member_name).toBe('深圳宝安国际机场')
  })

  it('支持汇率币种与生效日期筛选', async () => {
    const rates = await listLmdRecords('exchange-rates', {
      from_currency_code: 'USD',
      to_currency_code: 'CNY',
      effective_date: '2026-10-13',
    })
    expect(rates.list).toHaveLength(1)
    expect(rates.list[0]?.rate).toBe(7.1234)
  })

  it('拒绝重复编码和不存在的关联对象，并保持原数据', async () => {
    await expect(
      createLmdRecord('countries', { code: 'CN', name: '重复测试' }),
    ).rejects.toMatchObject({ message: '记录已存在，请检查编码或关联对象' })
    await expect(
      createLmdRecord('provinces', { code: 'UI-BAD', name: '关联测试', country_id: 99999 }),
    ).rejects.toMatchObject({ message: '请选择有效的国家' })
    expect((await listLmdRecords('countries', {})).total).toBe(24)
  })

  it('提供可测试的查询失败信号', async () => {
    await expect(listLmdRecords('countries', { keyword: '__mock_error__' })).rejects.toMatchObject({
      message: '模拟查询失败，请稍后重试',
    })
  })

  it.each([
    { development: false, enabled: true },
    { development: true, enabled: false },
  ])('关闭或非开发态不会替代真实接口：%j', async (options) => {
    const client = createHttp('http://127.0.0.1:5173')
    client.defaults.adapter = async (config) => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { code: 200, data: { transport: 'real' } },
    })
    const cleanup = installLmdMock(client, options)
    expect((await client.get('/pcs/api/lmd/v1/countries')).data).toEqual({ transport: 'real' })
    cleanup()
  })
})
