<template>
  <section class="section">
    <h2 class="section__title">⑧ 表格 Table</h2>

    <ByCard title="完整表格（冻结列 + 行选择 + 操作列）" class="section__card">
      <ByTable
        :columns="columns"
        :data="tableData"
        :pagination="false"
        row-selection
        :selected-row-keys="selectedKeys"
        @selection-change="onSelectionChange"
      >
        <template #status="{ record }">
          <ByStatusTag
            :status="(record as Row).statusKey === 'signed' ? 'success' : 'processing'"
            :text="(record as Row).status"
          />
        </template>
        <template #action="{ record }">
          <div class="by-table-ops">
            <a-button type="text">详情</a-button>
            <a-button type="text">编辑</a-button>
            <a-button v-if="(record as Row).showDelete" type="text" status="danger">删除</a-button>
            <a-dropdown v-else-if="(record as Row).showMore" trigger="click">
              <a-button type="text">更多</a-button>
              <template #content>
                <a-doption>删除</a-doption>
              </template>
            </a-dropdown>
          </div>
        </template>
      </ByTable>
      <p class="section__hint">
        表头 --color-bg-surface；标识/名称/状态/目的地/操作列左对齐；数字/金额/重量右对齐；操作列固定最右，文字按钮间距 16px；危险操作（删除）用 --color-error。
      </p>
    </ByCard>

    <ByCard title="空状态" class="section__card">
      <ByTable
        :columns="emptyColumns"
        :data="[]"
        :pagination="false"
        row-selection
      >
        <template #empty>
          <ByEmpty
            preset="noData"
            title="暂无运单数据"
            description="试试调整筛选条件，或创建一条新运单"
          >
            <template #action>
              <a-button type="primary">
                <template #icon><icon-plus /></template>
                新增运单
              </a-button>
            </template>
          </ByEmpty>
        </template>
      </ByTable>
    </ByCard>

    <ByCard title="加载中" class="section__card">
      <ByTable :columns="columns" :data="[]" :loading="true" :pagination="false" />
    </ByCard>

    <a-alert type="warning" show-icon>表头 surface 底；行 hover/选中色阶区分；操作列固定右；数字列右对齐；Mobile 保持表格，内容较宽时横向滚动。</a-alert>

    <PropsDoc :groups="TABLE_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ByTable, ByCard, ByStatusTag, ByEmpty } from '@core/components'
import type { ByTableColumn } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { TABLE_PROP_GROUPS } from '../propDoc'

interface Row {
  id: string
  waybillNo: string
  channel: string
  status: string
  statusKey: 'shipping' | 'signed'
  destination: string
  showDelete?: boolean
  showMore?: boolean
}

/** 完整表格列（对齐设计稿：运单号 / 渠道 / 状态 / 目的地 / 操作） */
const columns: ByTableColumn[] = [
  { title: '运单号', dataIndex: 'waybillNo', fixed: 'left', ellipsis: 1 },
  { title: '渠道', dataIndex: 'channel' },
  { title: '状态', dataIndex: 'status' },
  { title: '目的地', dataIndex: 'destination', ellipsis: 1 },
  { title: '操作', dataIndex: 'action', fixed: 'right' },
]

/** 空状态示意列（对齐设计稿：运单号 / 渠道 / 状态 / 目的地） */
const emptyColumns: ByTableColumn[] = [
  { title: '运单号', dataIndex: 'waybillNo' },
  { title: '渠道', dataIndex: 'channel' },
  { title: '状态', dataIndex: 'status' },
  { title: '目的地', dataIndex: 'destination' },
]

const tableData: Row[] = [
  {
    id: '1',
    waybillNo: 'BY2406220001',
    channel: '自营空派',
    status: '运输中',
    statusKey: 'shipping',
    destination: '美国 CA',
  },
  {
    id: '2',
    waybillNo: 'BY2406220002',
    channel: '自营空派',
    status: '已签收',
    statusKey: 'signed',
    destination: '日本 东京',
    showDelete: true,
  },
  {
    id: '3',
    waybillNo: 'BY2406220003',
    channel: '自营空派',
    status: '运输中',
    statusKey: 'shipping',
    destination: '德国 柏林',
    showMore: true,
  },
]

const selectedKeys = ref<string[]>(['1'])

function onSelectionChange(keys: string[]) {
  selectedKeys.value = keys
}

const code = `<ByTable
  :columns="columns"
  :data="data"
  :pagination="false"
  row-selection
  :selected-row-keys="selectedKeys"
  @selection-change="onSelectionChange"
>
  <template #status="{ record }">
    <ByStatusTag
      :status="record.statusKey === 'signed' ? 'success' : 'processing'"
      :text="record.status"
    />
  </template>
  <template #action="{ record }">
    <div class="by-table-ops">
      <a-button type="text">详情</a-button>
      <a-button type="text">编辑</a-button>
      <a-button v-if="record.showDelete" type="text" status="danger">删除</a-button>
      <a-button v-else-if="record.showMore" type="text">更多</a-button>
    </div>
  </template>
</ByTable>`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.section__hint {
  margin: var(--spacing-sm) 0 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

</style>
