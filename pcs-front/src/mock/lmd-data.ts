import type { LmdRecord, LmdResource } from '@/api/lmd'

/** UI 演示数据；刷新页面恢复，不来自正式主数据。 */
export function createLmdFixtures(): Record<LmdResource, LmdRecord[]> {
  const countryNames = [
    ['CN', '中国', 'China'],
    ['US', '美国', 'United States'],
    ['GB', '英国', 'United Kingdom'],
    ['DE', '德国', 'Germany'],
    ['JP', '日本', 'Japan'],
    ['FR', '法国', 'France'],
    ['AU', '澳大利亚', 'Australia'],
    ['CA', '加拿大', 'Canada'],
    ['SG', '新加坡', 'Singapore'],
    ['KR', '韩国', 'South Korea'],
    ['VN', '越南', 'Vietnam'],
    ['TH', '泰国', 'Thailand'],
    ['MY', '马来西亚', 'Malaysia'],
    ['ID', '印度尼西亚', 'Indonesia'],
    ['PH', '菲律宾', 'Philippines'],
    ['IN', '印度', 'India'],
    ['AE', '阿联酋', 'United Arab Emirates'],
    ['SA', '沙特阿拉伯', 'Saudi Arabia'],
    ['BR', '巴西', 'Brazil'],
    ['MX', '墨西哥', 'Mexico'],
    ['ZA', '南非', 'South Africa'],
    ['NZ', '新西兰', 'New Zealand'],
    ['NL', '荷兰', 'Netherlands'],
    ['VC', '圣文森特和格林纳丁斯', 'Saint Vincent and the Grenadines'],
  ]
  const row = (id: number, code: string, name: string, extra: LmdRecord = {}): LmdRecord => ({
    id,
    code,
    name,
    status: 1,
    version_no: 1,
    source: 'mock',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
    ...extra,
  })
  return {
    countries: countryNames.map(([code, name, name_en], index) =>
      row(index + 1, code!, name!, {
        name_en,
        status: index === 5 || index === 15 ? 0 : 1,
      }),
    ),
    provinces: [
      row(101, 'CN-GD', '广东省', { name_en: 'Guangdong', country_id: 1 }),
      row(102, 'US-CA', '加利福尼亚州', { name_en: 'California', country_id: 2 }),
      row(103, 'GB-ENG', '英格兰', { name_en: 'England', country_id: 3 }),
      row(104, 'CN-ZJ', '浙江省', { name_en: 'Zhejiang', country_id: 1, status: 0 }),
    ],
    cities: [
      row(201, 'CN-SZX', '深圳市', { name_en: 'Shenzhen', country_id: 1, province_id: 101 }),
      row(202, 'CN-CAN', '广州市', { name_en: 'Guangzhou', country_id: 1, province_id: 101 }),
      row(203, 'US-LAX', '洛杉矶', { name_en: 'Los Angeles', country_id: 2, province_id: 102 }),
      row(204, 'GB-LON', '伦敦', { name_en: 'London', country_id: 3, province_id: 103 }),
    ],
    districts: [
      row(301, 'CN-NS', '南山区', { city_id: 201 }),
      row(302, 'CN-FT', '福田区', { city_id: 201 }),
      row(303, 'CN-TH', '天河区', { city_id: 202 }),
    ],
    'postal-codes': [
      row(351, '518000', '深圳邮编', {
        country_id: 1,
        postal_code: '518000',
        postal_code_end: '518999',
      }),
      row(352, '510000', '广州邮编', { country_id: 1, postal_code: '510000', postal_code_end: '' }),
      row(353, '90001', '洛杉矶邮编', {
        country_id: 2,
        postal_code: '90001',
        postal_code_end: '90099',
      }),
    ],
    airports: [
      row(401, 'SZX', '深圳宝安国际机场', {
        name_en: 'Shenzhen Baoan',
        icao_code: 'ZGSZ',
        country_id: 1,
        city_id: 201,
      }),
      row(402, 'LAX', '洛杉矶国际机场', {
        name_en: 'Los Angeles International',
        icao_code: 'KLAX',
        country_id: 2,
        city_id: 203,
      }),
      row(403, 'LHR', '伦敦希思罗机场', {
        name_en: 'London Heathrow',
        icao_code: 'EGLL',
        country_id: 3,
        city_id: 204,
      }),
    ],
    ports: [
      row(501, 'CNSZX', '深圳港', { country_id: 1, city_id: 201 }),
      row(502, 'USLAX', '洛杉矶港', { country_id: 2, city_id: 203 }),
    ],
    warehouses: [
      row(601, 'MOCK-SZ', '深圳演示仓库', {
        country_id: 1,
        city_id: 201,
        address: '演示地址：深圳市南山区测试路 1 号',
      }),
      row(602, 'MOCK-LA', '洛杉矶演示仓库', {
        country_id: 2,
        city_id: 203,
        address: 'UI sample address, Los Angeles',
        status: 0,
      }),
    ],
    airlines: [
      row(701, 'CZ', '中国南方航空', { icao_code: 'CSN', country_id: 1 }),
      row(702, 'CA', '中国国际航空', { icao_code: 'CCA', country_id: 1 }),
      row(703, 'AA', '美国航空', { icao_code: 'AAL', country_id: 2 }),
    ],
    'transport-modes': [
      row(801, 'AIR', '空运'),
      row(802, 'SEA', '海运'),
      row(803, 'ROAD', '公路运输'),
      row(804, 'RAIL', '铁路运输', { status: 0 }),
    ],
    'cargo-types': [
      row(811, 'GENERAL', '普货', { description: '普通货物演示分类' }),
      row(812, 'BATTERY', '含电货物', {
        description: '用于测试长文本、表格截断及 Tooltip 展示的演示说明。',
      }),
      row(813, 'FRAGILE', '易碎品', { description: '', status: 0 }),
    ],
    'packaging-types': [
      row(821, 'CARTON', '纸箱', { description: '纸箱包装' }),
      row(822, 'PALLET', '托盘', { description: '托盘包装' }),
      row(823, 'WOOD', '木箱', { description: '木箱包装' }),
    ],
    'supervision-modes': [
      row(831, '0110', '一般贸易', { description: '演示业务字典' }),
      row(832, '9610', '跨境贸易电子商务', { description: '演示业务字典' }),
      row(833, '1210', '保税跨境贸易电子商务', { description: '', status: 0 }),
    ],
    'fee-items': [
      row(841, 'FREIGHT', '运费', {
        name_en: 'Freight',
        group_code: 'TRANSPORT',
        default_currency_code: 'CNY',
      }),
      row(842, 'FUEL', '燃油附加费', {
        name_en: 'Fuel surcharge',
        group_code: 'SURCHARGE',
        default_currency_code: 'USD',
      }),
      row(843, 'HANDLING', '操作费', {
        name_en: 'Handling',
        group_code: 'OPERATION',
        default_currency_code: 'CNY',
        status: 0,
      }),
    ],
    currencies: [
      row(41, 'CNY', '人民币', { name_en: 'Chinese Yuan', symbol: '¥', decimal_digits: 2 }),
      row(42, 'USD', '美元', { name_en: 'US Dollar', symbol: '$', decimal_digits: 2 }),
      row(43, 'EUR', '欧元', { name_en: 'Euro', symbol: '€', decimal_digits: 2 }),
      row(44, 'HKD', '港币', { name_en: 'Hong Kong Dollar', symbol: 'HK$', decimal_digits: 2 }),
    ],
    'air-regions': [
      row(901, 'ASIA', '亚洲航线区域'),
      row(902, 'AMERICA', '美洲航线区域'),
      row(903, 'EUROPE', '欧洲航线区域', { status: 0 }),
    ],
    'air-region-countries': [
      row(911, 'ASIA-CN', '亚洲 / 中国', { air_region_id: 901, country_id: 1 }),
      row(912, 'AMERICA-US', '美洲 / 美国', { air_region_id: 902, country_id: 2 }),
      row(913, 'EUROPE-GB', '欧洲 / 英国', { air_region_id: 903, country_id: 3, status: 0 }),
    ],
    'exchange-rates': [
      row(921, 'USD-CNY', '美元 / 人民币', {
        from_currency_code: 'USD',
        to_currency_code: 'CNY',
        rate: 7.1234,
        effective_from: '2026-10-01',
        effective_to: '2026-10-31',
      }),
      row(922, 'EUR-CNY', '欧元 / 人民币', {
        from_currency_code: 'EUR',
        to_currency_code: 'CNY',
        rate: 7.8123,
        effective_from: '2026-10-01',
        effective_to: '',
      }),
      row(923, 'HKD-CNY', '港币 / 人民币', {
        from_currency_code: 'HKD',
        to_currency_code: 'CNY',
        rate: 0.9123,
        effective_from: '2026-09-01',
        effective_to: '2026-09-30',
        status: 0,
      }),
    ],
    'reference-zones': [
      row(1001, 'MOCK-ZONE-ASIA', '亚洲演示 Zone', {
        carrier_scope: 'common',
        scheme_code: 'MOCK-2026',
        remark: '仅用于本地 UI 测试',
      }),
      row(1002, 'MOCK-ZONE-US', '美国演示 Zone', {
        carrier_scope: 'ups',
        scheme_code: 'MOCK-2026',
        remark: '',
        status: 0,
      }),
      row(1003, 'MOCK-ZONE-OLD', '停用演示 Zone', {
        carrier_scope: 'self',
        scheme_code: 'MOCK-OLD',
        remark: '停用状态演示',
        status: 2,
      }),
    ],
    'reference-zone-members': [
      row(1011, 'ZONE-ASIA-CN', '中国成员', {
        zone_id: 1001,
        member_type: 'country',
        member_id: 1,
        include_type: 'include',
        display_name: '中国范围',
      }),
      row(1012, 'ZONE-ASIA-SZX', '深圳机场成员', {
        zone_id: 1001,
        member_type: 'airport',
        member_id: 401,
        include_type: 'exclude',
        display_name: '',
      }),
      row(1013, 'ZONE-US-LAX', '洛杉矶成员', {
        zone_id: 1002,
        member_type: 'city',
        member_id: 203,
        include_type: 'include',
        display_name: '洛杉矶城市范围',
      }),
    ],
  }
}
