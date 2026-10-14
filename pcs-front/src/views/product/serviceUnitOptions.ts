/**
 * 服务单元域内的选项常量。
 *
 * 编辑表单的下拉与详情页的只读展示共用同一份，避免同一套标签在两处各写一份而漂移；
 * 与 src/views/master-data/config.ts 的组织方式一致（域内常量集中一处）。
 */

export interface ServiceUnitOptionItem {
  value: string
  label: string
}

/** 覆盖范围：对应 ServiceUnitCoverage 的 A—F。 */
export const COVERAGE_OPTIONS: ServiceUnitOptionItem[] = [
  { value: 'A', label: 'A 国内揽收' },
  { value: 'B', label: 'B 库内操作' },
  { value: 'C', label: 'C 报关操作' },
  { value: 'D', label: 'D 干线运输' },
  { value: 'E', label: 'E 清关操作' },
  { value: 'F', label: 'F 尾程服务' },
]

/** 覆盖范围代码 → 展示文案；未匹配时原样返回代码。 */
export function coverageLabel(code: string): string {
  return COVERAGE_OPTIONS.find((option) => option.value === code)?.label ?? code
}

/** 货物准入类型：数组驱动渲染，模板不写死任何一项；暂以名称作值，后续接入码表再替换。 */
export const GOODS_TYPE_OPTIONS: ServiceUnitOptionItem[] = [
  { value: '普货', label: '普货' },
  { value: '食品', label: '食品' },
  { value: '纺织产品', label: '纺织产品' },
  { value: '穿戴纺织品', label: '穿戴纺织品' },
  { value: '玩具产品', label: '玩具产品' },
  { value: '木制产品', label: '木制产品' },
  { value: '皮革产品', label: '皮革产品' },
  { value: '塑料产品', label: '塑料产品' },
  { value: '电子产品', label: '电子产品' },
  { value: '带弱磁产品', label: '带弱磁产品' },
  { value: '带电产品', label: '带电产品' },
  { value: '木箱', label: '木箱' },
  { value: '反倾销产品', label: '反倾销产品' },
  { value: '纯电池', label: '纯电池' },
  { value: '电子烟', label: '电子烟' },
  { value: '涉及认证类产品', label: '涉及认证类产品' },
]
