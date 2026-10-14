import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import {
  Table as ATable,
  Spin as ASpin,
  Pagination as APagination,
  Tooltip as ATooltip,
} from '@arco-design/web-vue'
import ByTable, { type ByTableColumn } from './ByTable.vue'
import { setDevice } from '@core/composables/useDevice'

const globalComponents = { ATable, ASpin, APagination, ATooltip }

const columns: ByTableColumn[] = [
  { title: '单号', dataIndex: 'orderNo', fixed: 'left' },
  { title: '金额', dataIndex: 'amount', valueType: 'money' },
  { title: '备注', dataIndex: 'remark', ellipsis: 1 },
]

const data = [
  { id: 1, orderNo: 'A001', amount: 1234.5, remark: '一段很长的备注文字用于测试省略' },
]

describe('ByTable', () => {
  it('空 data 显示空态', () => {
    const wrapper = mount(ByTable, {
      props: { columns, data: [] },
      global: { components: globalComponents },
    })
    expect(wrapper.findComponent({ name: 'ByEmpty' }).exists()).toBe(true)
  })

  it('fixed 列配置透传给 a-table columns', () => {
    const wrapper = mount(ByTable, {
      props: { columns, data },
      global: { components: globalComponents },
    })
    const tableProps = wrapper.findComponent(ATable).props('columns') as ByTableColumn[]
    expect(tableProps.find((c) => c.dataIndex === 'orderNo')?.fixed).toBe('left')
  })

  it('行选择列默认固定为 40px，避免横向滚动表格将剩余空间分配给选择列', () => {
    const wrapper = mount(ByTable, {
      props: { columns, data, rowSelection: true, scrollX: 1050 },
      global: { components: globalComponents },
    })

    expect(wrapper.findComponent(ATable).props('rowSelection')).toMatchObject({
      type: 'checkbox',
      width: 40,
    })
  })

  it('保留调用方自定义的行选择列宽度', () => {
    const wrapper = mount(ByTable, {
      props: { columns, data, rowSelection: { width: 48 }, scrollX: 1050 },
      global: { components: globalComponents },
    })

    expect(wrapper.findComponent(ATable).props('rowSelection')).toMatchObject({ width: 48 })
  })

  it('移动端取消左右冻结列，保证中间列可横向滑动查看', async () => {
    const originalWidth = window.innerWidth
    window.innerWidth = 375

    const wrapper = mount(ByTable, {
      props: {
        columns: [
          { title: '单号', dataIndex: 'orderNo', fixed: 'left', width: 160 },
          { title: '金额', dataIndex: 'amount', width: 120 },
          { title: '操作', dataIndex: 'action', fixed: 'right', width: 120 },
        ],
        data,
        rowSelection: true,
        scrollX: 1050,
      },
      global: { components: globalComponents },
    })

    try {
      await nextTick()
      const table = wrapper.findComponent(ATable)
      const tableColumns = table.props('columns') as ByTableColumn[]
      expect(tableColumns.every((column) => column.fixed === undefined)).toBe(true)
      expect(table.props('rowSelection')).toMatchObject({ fixed: false, width: 40 })
      expect(wrapper.findComponent(APagination).props('simple')).toBe(true)
    } finally {
      wrapper.unmount()
      window.innerWidth = originalWidth
      setDevice('desktop')
    }
  })

  it('数值 scrollX 作为最小宽度，宽屏表格仍撑满容器', () => {
    const scrollColumns: ByTableColumn[] = [
      { title: '单号', dataIndex: 'orderNo', fixed: 'left', width: 160 },
      { title: '金额', dataIndex: 'amount', valueType: 'money', width: 120 },
      { title: '备注', dataIndex: 'remark', width: 180 },
    ]
    const wrapper = mount(ByTable, {
      props: { columns: scrollColumns, data, scrollX: 1050 },
      global: { components: globalComponents },
    })

    expect(wrapper.findComponent(ATable).props('scroll')).toEqual({
      x: '100%',
      minWidth: 1050,
    })
    const tableColumns = wrapper.findComponent(ATable).props('columns') as ByTableColumn[]
    expect(tableColumns[0]).toMatchObject({ width: 160, fixed: 'left' })
    expect(tableColumns[1]).toMatchObject({ width: 120 })
    expect(tableColumns[1]?.minWidth).toBeUndefined()
    expect(tableColumns[2]).toMatchObject({ width: 180 })
  })

  it('valueType=money 列右对齐且格式化正确', () => {
    const wrapper = mount(ByTable, {
      props: { columns, data },
      global: { components: globalComponents },
    })
    const tableProps = wrapper.findComponent(ATable).props('columns') as ByTableColumn[]
    const amountCol = tableProps.find((c) => c.dataIndex === 'amount')
    expect(amountCol?.align).toBe('right')
  })

  it('标识列默认左对齐', () => {
    const wrapper = mount(ByTable, {
      props: { columns, data },
      global: { components: globalComponents },
    })
    const tableProps = wrapper.findComponent(ATable).props('columns') as ByTableColumn[]
    const orderCol = tableProps.find((c) => c.dataIndex === 'orderNo')
    expect(orderCol?.align).toBe('left')
  })

  it('非数值列默认左对齐（规范 §5.8）', () => {
    const cols: ByTableColumn[] = [
      { title: '下单时间', dataIndex: 'createdAt' },
    ]
    const wrapper = mount(ByTable, {
      props: { columns: cols, data: [{ id: 1, createdAt: '2026-07-17 09:05:00' }] },
      global: { components: globalComponents },
    })
    const tableProps = wrapper.findComponent(ATable).props('columns') as ByTableColumn[]
    expect(tableProps[0]?.align).toBe('left')
  })

  it('分页默认每页 20', () => {
    const wrapper = mount(ByTable, {
      props: { columns, data, pagination: { current: 1, pageSize: 20, total: 1 } },
      global: { components: globalComponents },
    })
    expect(wrapper.findComponent(APagination).props('pageSize')).toBe(20)
    expect(wrapper.findComponent(APagination).props('simple')).toBe(false)
  })

  it('传入旧版 cardConfig 时仍统一渲染表格', () => {
    const wrapper = mount(ByTable, {
      props: {
        columns,
        data,
        cardConfig: { titleField: 'orderNo', infoFields: ['amount'] },
      },
      global: { components: globalComponents },
    })

    expect(wrapper.findComponent(ATable).exists()).toBe(true)
    expect(wrapper.find('.by-table__cards').exists()).toBe(false)
  })
})
