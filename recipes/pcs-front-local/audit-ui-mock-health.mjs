import { createLmdFixtures } from '../../pcs-front/src/mock/lmd-data.ts'
import { MASTER_DATA_CONFIGS, MASTER_DATA_GROUPS } from '../../pcs-front/src/views/master-data/config.ts'
import { readFile, writeFile } from 'node:fs/promises'

const fixtures = createLmdFixtures()
const configs = Object.values(MASTER_DATA_CONFIGS)
const errors = []
const warnings = []
const references = {
  country_id: 'countries', province_id: 'provinces', city_id: 'cities',
  air_region_id: 'air-regions', zone_id: 'reference-zones',
}
const memberResources = {
  country: 'countries', province: 'provinces', city: 'cities', district: 'districts',
  airport: 'airports', port: 'ports', warehouse: 'warehouses', postal_code: 'postal-codes',
}
const hasValue = value => value !== undefined && value !== null && value !== ''
const exists = (resource, key, value) => fixtures[resource]?.some(row => String(row[key]) === String(value))
const resources = configs.map(config => {
  const rows = fixtures[config.resource] ?? []
  if (!rows.length) errors.push(`${config.resource}: missing or empty fixtures`)
  for (const idField of new Set(['id', config.idField])) {
    const values = rows.map(row => row[idField])
    if (values.some(value => !hasValue(value))) errors.push(`${config.resource}: missing ${idField}`)
    if (new Set(values).size !== values.length) errors.push(`${config.resource}: duplicate ${idField}`)
  }
  const uniqueFields = config.resource === 'air-region-countries' ? ['air_region_id','country_id']
    : config.resource === 'reference-zone-members' ? ['zone_id','member_type','member_id','include_type']
    : config.resource === 'postal-codes' ? ['country_id','postal_code']
    : config.resource === 'exchange-rates' ? ['from_currency_code','to_currency_code','effective_from'] : ['code']
  const uniqueKeys = rows.map(row => JSON.stringify(uniqueFields.map(key => row[key])))
  if (new Set(uniqueKeys).size !== rows.length) errors.push(`${config.resource}: duplicate composite key`)
  for (const row of rows) {
    const prefix = `${config.resource}[${row[config.idField]}]`
    if (row.source !== 'mock') errors.push(`${prefix}: source is not mock`)
    for (const field of config.fields) {
      const value = row[field.key]
      if (field.required && !hasValue(value)) errors.push(`${prefix}: missing required ${field.key}`)
      if (field.kind === 'number' && hasValue(value) &&
          (!Number.isFinite(Number(value)) || Number(value) < (field.min ?? 0) || Number(value) > (field.max ?? Infinity))) {
        errors.push(`${prefix}: invalid number ${field.key}`)
      }
      const options = field.options ?? field.statusOptions
      if (options && hasValue(value) && !options.some(option => option.value === value)) errors.push(`${prefix}: invalid option ${field.key}`)
      if (field.kind === 'lookup' && hasValue(value)) {
        const target = field.lookup?.resource ?? field.lookup?.resourceMap?.[row[field.lookup?.resourceField]]
        if (!target || !exists(target, field.lookup.valueField, value)) errors.push(`${prefix}: orphan ${field.key}`)
        for (const [queryKey, parentKey] of Object.entries(field.lookup?.queryFields ?? {})) {
          if (hasValue(row[parentKey])) {
            const parent = fixtures[target]?.find(item => String(item[field.lookup.valueField]) === String(value))
            if (parent && String(parent[queryKey]) !== String(row[parentKey])) errors.push(`${prefix}: inconsistent parent ${field.key}/${parentKey}`)
          }
        }
      }
      if (field.kind === 'date' && hasValue(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors.push(`${prefix}: invalid date ${field.key}`)
    }
    for (const [key, target] of Object.entries(references)) {
      if (hasValue(row[key]) && !exists(target, 'id', row[key])) errors.push(`${prefix}: orphan ${key}`)
    }
    if (hasValue(row.default_currency_code) && !exists('currencies','code',row.default_currency_code)) errors.push(`${prefix}: orphan default currency`)
    if (hasValue(row.member_type) && (!memberResources[row.member_type] || !exists(memberResources[row.member_type], 'id', row.member_id))) errors.push(`${prefix}: orphan member`)
    if (hasValue(row.include_type) && !['include','exclude'].includes(row.include_type)) errors.push(`${prefix}: invalid include type`)
    if (hasValue(row.effective_to) && row.effective_to < row.effective_from) errors.push(`${prefix}: invalid effective range`)
  }
  return { key:config.key, title:config.title, resource:config.resource, rows:rows.length,
    statuses:[...new Set(rows.map(row => row.status))], menu:config.visibleInMenu !== false }
})
for (const resource of Object.keys(fixtures)) {
  if (!configs.some(config => config.resource === resource)) errors.push(`${resource}: fixtures without a UI config`)
}
const authSource = await readFile(new URL('../../pcs-front/src/mock/auth.ts',import.meta.url),'utf8')
const keyBlock = authSource.match(/const MASTER_DATA_PERMISSION_KEYS = \[([\s\S]*?)\]/)?.[1] ?? ''
const permissionKeys = [...keyBlock.matchAll(/'([^']+)'/g)].map(match => match[1])
for (const config of configs) if (!permissionKeys.includes(config.key)) errors.push(`${config.key}: missing explicit mock permission key`)
for (const group of MASTER_DATA_GROUPS) for (const key of group.resources) if (!MASTER_DATA_CONFIGS[key]) errors.push(`${key}: invalid menu key`)
warnings.push('Fixtures are per-page memory; refresh or full reload resets edits.')
warnings.push('Full mock permissions exercise allowed actions, not denied-role behavior.')
warnings.push('Domain rules, referenced-record deletion and real backend consistency are outside this fixture audit.')
const report = { checkedAt:new Date().toISOString(), branch:'dev', scope:'frontend-only-ui-mock',
  resourceCount:resources.length, visibleResourceCount:resources.filter(resource=>resource.menu).length,
  recordCount:resources.reduce((total,resource)=>total+resource.rows,0), permissionKeyCount:permissionKeys.length,
  resources, errors, warnings, healthy:errors.length===0 }
await writeFile(new URL('./ui-mock-fixture-health-20261013.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report,null,2))
process.exitCode=errors.length?1:0
