import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PropsDoc from './PropsDoc.vue'
import {
  ALERT_PROP_GROUPS,
  BUTTON_PROP_GROUPS,
  CARD_PROP_GROUPS,
  CHECKBOX_PROP_GROUPS,
  DRAWER_PROP_GROUPS,
  FORM_PROP_GROUPS,
  INPUT_PROP_GROUPS,
  MESSAGE_PROP_GROUPS,
  MODAL_PROP_GROUPS,
  POPOVER_PROP_GROUPS,
  RADIO_PROP_GROUPS,
  RICH_TEXT_PROP_GROUPS,
  SELECTOR_PROP_GROUPS,
  TABLE_PROP_GROUPS,
  TAG_BADGE_PROP_GROUPS,
  TOOLTIP_PROP_GROUPS,
  UPLOAD_PROP_GROUPS,
  type PropDocGroup,
} from './propDoc'

vi.mock('@core/components', () => ({
  ByCard: {
    name: 'ByCard',
    props: ['title', 'variant'],
    template: '<section data-test="card"><h2>{{ title }}</h2><slot /></section>',
  },
}))

const SECTION_IMPORTS: Record<string, string> = {
  ButtonSection: 'BUTTON_PROP_GROUPS',
  InputSection: 'INPUT_PROP_GROUPS',
  SelectorSection: 'SELECTOR_PROP_GROUPS',
  RadioSection: 'RADIO_PROP_GROUPS',
  CheckboxSection: 'CHECKBOX_PROP_GROUPS',
  UploadSection: 'UPLOAD_PROP_GROUPS',
  FormSection: 'FORM_PROP_GROUPS',
  TableSection: 'TABLE_PROP_GROUPS',
  CardSection: 'CARD_PROP_GROUPS',
  ModalSection: 'MODAL_PROP_GROUPS',
  DrawerSection: 'DRAWER_PROP_GROUPS',
  AlertSection: 'ALERT_PROP_GROUPS',
  TagBadgeSection: 'TAG_BADGE_PROP_GROUPS',
  MessageSection: 'MESSAGE_PROP_GROUPS',
  TooltipSection: 'TOOLTIP_PROP_GROUPS',
  PopoverSection: 'POPOVER_PROP_GROUPS',
  RichTextSection: 'RICH_TEXT_PROP_GROUPS',
}

const ALL_GROUPS: PropDocGroup[][] = [
  BUTTON_PROP_GROUPS,
  INPUT_PROP_GROUPS,
  SELECTOR_PROP_GROUPS,
  RADIO_PROP_GROUPS,
  CHECKBOX_PROP_GROUPS,
  UPLOAD_PROP_GROUPS,
  FORM_PROP_GROUPS,
  TABLE_PROP_GROUPS,
  CARD_PROP_GROUPS,
  MODAL_PROP_GROUPS,
  DRAWER_PROP_GROUPS,
  ALERT_PROP_GROUPS,
  TAG_BADGE_PROP_GROUPS,
  MESSAGE_PROP_GROUPS,
  TOOLTIP_PROP_GROUPS,
  POPOVER_PROP_GROUPS,
  RICH_TEXT_PROP_GROUPS,
]

describe('组件展示页可传递参数', () => {
  it('17 个 Section 都挂了 PropsDoc 与对应数据', () => {
    const SECTION_SOURCES = import.meta.glob<string>('./sections/*.vue', {
      query: '?raw',
      import: 'default',
      eager: true,
    })

    for (const [file, exportName] of Object.entries(SECTION_IMPORTS)) {
      const src = SECTION_SOURCES[`./sections/${file}.vue`]
      expect(src, `${file} 源文件未读取到`).toBeDefined()
      expect(src, `${file} 缺少 PropsDoc`).toContain('<PropsDoc')
      expect(src, `${file} 未引用 ${exportName}`).toContain(exportName)
    }
    expect(Object.keys(SECTION_IMPORTS)).toHaveLength(17)
  })

  it('易错项与组件源一致', () => {
    const byName = (groups: PropDocGroup[], groupTitle: string, name: string) =>
      groups.find((g) => g.title === groupTitle)?.rows.find((r) => r.name === name)

    expect(byName(ALERT_PROP_GROUPS, 'a-alert', 'show-icon')?.default).toBe('true')
    expect(byName(TABLE_PROP_GROUPS, 'ByTable', '#[dataIndex]')?.type).toBe('slot { record, value }')
    expect(byName(TABLE_PROP_GROUPS, 'ByTableColumn', 'valueType')?.type).toContain('money')
    expect(byName(TABLE_PROP_GROUPS, 'ByEmpty（空状态插槽）', '#aiSuggestion')?.type).toBe('slot')
    expect(byName(MESSAGE_PROP_GROUPS, 'confirmAction(options)', 'okText')?.type).toBe('string')
    expect(byName(MESSAGE_PROP_GROUPS, 'confirmAction(options)', 'ok-text')).toBeUndefined()
    expect(byName(RICH_TEXT_PROP_GROUPS, 'RichText', 'content')?.required).toBeFalsy()
    expect(byName(SELECTOR_PROP_GROUPS, 'a-select', 'allow-search')?.default).toContain('多选')
    expect(byName(TAG_BADGE_PROP_GROUPS, 'a-badge', 'count')?.type).toBe('number')
  })

  it('每组参数表都能渲染出表头与至少一行', () => {
    expect(ALL_GROUPS).toHaveLength(17)
    for (const groups of ALL_GROUPS) {
      expect(groups.length).toBeGreaterThan(0)
      for (const group of groups) {
        expect(group.rows.length).toBeGreaterThan(0)
        for (const row of group.rows) {
          expect(row.name.length).toBeGreaterThan(0)
          expect(row.type.length).toBeGreaterThan(0)
          expect(row.desc.length).toBeGreaterThan(0)
        }
      }
      const wrapper = mount(PropsDoc, { props: { groups } })
      expect(wrapper.text()).toContain('可传递参数')
      expect(wrapper.text()).toContain('参数')
      expect(wrapper.text()).toContain('类型')
      expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0)
    }
  })
})
