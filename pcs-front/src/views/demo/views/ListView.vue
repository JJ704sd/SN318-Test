<template>
  <div class="list-view-page">
    <PageHeader type="standard" title="运单管理">
      <template #extra>
        <a-space>
          <a-button
            v-permission="'operation:frontend_demo.demo.import'"
            @click="importVisible = true"
          >
            <template #icon><icon-import /></template>
            导入
          </a-button>
          <a-button
            v-permission="'operation:frontend_demo.demo.create'"
            type="primary"
            @click="handleCreate"
          >
            <template #icon><icon-plus /></template>
            新建运单
          </a-button>
        </a-space>
      </template>
    </PageHeader>

    <div class="list-view">
    <ListFilterBar
      v-model:query="queryParams"
      v-model:date-range="dateRange"
      @search="search"
      @reset="reset"
    />

    <!-- 自然语言筛选（AI）：解析为结构化条件回填筛选控件，仅内嵌 AI 开启时加载 -->
    <AiNlFilter v-if="aiEmbeddedOn" @parsed="onNlParsed" />

    <ByCard>
      <ListBatchBar
        v-if="selectedRowKeys.length"
        :selected-count="selectedRowKeys.length"
        permission-prefix="operation:frontend_demo.demo"
        @clear-selection="clearSelection"
        @batch-delete="handleBatchDelete"
        @batch-enable="handleBatchEnable"
        @export="handleExportSelected"
        @print="handlePrint"
      >
        <template #extra>
          <a-button
            v-if="aiEmbeddedOn"
            class="list-view__ai-trigger"
            size="small"
            type="text"
            :loading="aiLoading"
            @click="onFetchAiSuggestions"
          >
            <template #icon><SvgIcon name="ai-sparkle" /></template>
            {{ TEXT.aiTrigger }}
          </a-button>
        </template>
      </ListBatchBar>
      <div v-else class="list-view__toolbar">
        <span class="list-view__toolbar-total">
          共 <strong>{{ pagination.total }}</strong> 条
        </span>
        <a-space>
          <a-button @click="fetchList">
            <template #icon><icon-refresh /></template>
            刷新
          </a-button>
          <a-button
            v-permission="'operation:frontend_demo.demo.export'"
            @click="handleExportAll"
          >
            <template #icon><icon-export /></template>
            导出
          </a-button>
        </a-space>
      </div>

      <!-- AI 建议面板：拉到建议 -> 用户采纳前；不产生副作用，采纳才进待确认 -->
      <ListAiSuggestions
        v-if="aiEmbeddedOn && showAiSuggestions"
        :loading="aiLoading"
        :suggestions="aiSuggestions"
        @apply="onApplySuggestion"
        @close="onCloseAiSuggestions"
      />

      <!-- AI 待确认动作条：用户采纳后自动从 store.pendingAction 取，确认->执行由组件自洽 -->
      <AiActionBar v-if="aiEmbeddedOn && aiStore?.pendingAction" class="list-view__ai-action" />

      <ByTable
        :columns="columns"
        :data="list"
        :loading="loading"
        :scroll-x="LIST_TABLE_SCROLL_WIDTH"
        :pagination="pagination"
        row-selection
        :selected-row-keys="selectedRowKeys"
        @page-change="changePage"
        @selection-change="onSelectionChange"
      >
        <!-- 筛选后无结果：ByEmpty preset=noResult + aiSuggestion 插槽（AI 可能原因 + 一键放宽） -->
        <template #empty>
          <ByEmpty preset="noResult">
            <template #aiSuggestion>
              <ListEmptyAi v-if="aiEmbeddedOn && hasActiveFilter" @relax="onRelax" />
            </template>
          </ByEmpty>
        </template>
        <template #waybillNo="{ record }">
          <a-link :hoverable="false" @click="goDetail(record as WaybillListItem)">
            {{ (record as WaybillListItem).waybillNo }}
          </a-link>
        </template>
        <template #bizType="{ record }">
          <ByBizTag :type="(record as WaybillListItem).bizType" />
        </template>
        <template #status="{ record }">
          <ListStatusCell
            v-model:editing-status="editingStatus"
            :editing="editingId === (record as WaybillListItem).id"
            :status-type="getStatusType((record as WaybillListItem).status)"
            :status-label="STATUS_LABEL[(record as WaybillListItem).status]"
            :status-options="STATUS_OPTIONS"
            @start-edit="startEditStatus(record as WaybillListItem)"
            @stop-edit="stopEditStatus(record as WaybillListItem)"
          />
        </template>
        <template #createdAt="{ record }">
          {{ formatDateTime((record as WaybillListItem).createdAt) }}
        </template>
        <template #action="{ record }">
          <a-space>
            <a-button
              v-permission="'operation:frontend_demo.demo.view_detail'"
              type="text"
              size="small"
              @click="openDrawer(record as WaybillListItem)"
            >
              详情
            </a-button>
            <a-button
              v-permission="'operation:frontend_demo.demo.view_trace'"
              type="text"
              size="small"
              @click="goDetail(record as WaybillListItem, 'trace')"
            >
              跟踪
            </a-button>
          </a-space>
        </template>
      </ByTable>
    </ByCard>
    </div>

    <ByModal
      v-model:visible="importVisible"
      title="导入运单"
      mode="form-single"
      :confirm-loading="importLoading"
      @confirm="handleImportConfirm"
      @cancel="handleImportCancel"
    >
      <ByUpload
        v-model:file-list="importFileList"
        mode="dragger"
        accept=".xlsx,.xls,.csv"
        :max-size="10"
        :max-count="1"
      />
    </ByModal>

    <ByDrawer
      v-model:visible="drawerVisible"
      :title="drawerTitle"
      size="large"
      :loading="detailLoading"
      @close="onDrawerClose"
    >
      <DetailDrawerContent
        v-if="detail"
        :detail="detail"
        @handle-action="handleWarningAction"
      />

      <template #footer>
        <a-button @click="onDrawerClose">关闭</a-button>
        <a-button
          v-permission="'operation:frontend_demo.demo.edit'"
          type="primary"
          @click="handleEdit"
        >
          编辑
        </a-button>
      </template>
    </ByDrawer>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { ByTable, ByCard, ByModal, ByDrawer, ByBizTag, ByEmpty, ByUpload, SvgIcon } from '@baiyun/template-core/components'
import { formatDateTime } from '@baiyun/template-core/utils'
import { useWaybillListPage } from '../composables/useWaybillListPage'
import type { WaybillListItem } from '@/api/demo'
import { STATUS_OPTIONS, STATUS_LABEL, getStatusType, columns, LIST_TABLE_SCROLL_WIDTH } from '../config/listConfig'
import PageHeader from '@/layout/components/PageHeader.vue'
import ListBatchBar from '@/components/biz/ListBatchBar.biz.vue'
import ListFilterBar from '../components/ListFilterBar.vue'
import DetailDrawerContent from '../components/DetailDrawerContent.biz.vue'
import ListStatusCell from '../components/ListStatusCell.vue'

const {
  list,
  loading,
  pagination,
  queryParams,
  dateRange,
  selectedRowKeys,
  fetchList,
  search,
  reset,
  changePage,
  clearSelection,
  onSelectionChange,
  editingId,
  editingStatus,
  startEditStatus,
  stopEditStatus,
  drawerVisible,
  drawerTitle,
  detail,
  detailLoading,
  openDrawer,
  onDrawerClose,
  handleWarningAction,
  handleEdit,
  importVisible,
  importLoading,
  importFileList,
  handleImportConfirm,
  handleImportCancel,
  handleBatchDelete,
  handleBatchEnable,
  handleExportAll,
  handleExportSelected,
  handlePrint,
  goDetail,
  handleCreate,
  aiEmbeddedOn,
  aiStore,
  aiSuggestions,
  aiLoading,
  showAiSuggestions,
  onFetchAiSuggestions,
  onApplySuggestion,
  onCloseAiSuggestions,
  onNlParsed,
  onRelax,
  hasActiveFilter,
  TEXT,
} = useWaybillListPage()

// 内嵌 AI 组件：仅 aiEnabled && aiEmbeddedEnabled 时经 /ai/embedded 子入口（或本地 AI 组件）
// 异步加载，关闭则不下载、不挂载；模板以 aiEmbeddedOn 门控
const AiNlFilter = aiEmbeddedOn
  ? defineAsyncComponent(() =>
      import('@baiyun/template-core/ai/embedded').then((m) => m.AiNlFilter),
    )
  : null
const AiActionBar = aiEmbeddedOn
  ? defineAsyncComponent(() =>
      import('@baiyun/template-core/ai/embedded').then((m) => m.AiActionBar),
    )
  : null
const ListAiSuggestions = aiEmbeddedOn
  ? defineAsyncComponent(() => import('../components/ListAiSuggestions.vue'))
  : null
const ListEmptyAi = aiEmbeddedOn
  ? defineAsyncComponent(() => import('../components/ListEmptyAi.vue'))
  : null
</script>

<style scoped>
/* 页面容器：transition 单根；左内边距由 basic-layout__content 提供，
 * PageHeader 用负 margin 抵消使其紧贴侧边栏通栏（内边距由 PageHeader 自身承担） */
.list-view-page {
  display: flex;
  flex-direction: column;
}

.list-view-page :deep(.page-header) {
  margin-left: calc(var(--layout-content-padding) * -1);
}

/* 承接内容区上/右/下内边距（Desktop 24 / Tablet 16 / Mobile 12，随断点 token）；
 * 与 PageHeader 的间距走 padding-top */
.list-view {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap); /* 筛选栏与列表卡之间的卡片间距 */

  padding-top: var(--layout-content-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--layout-content-padding);
}

.list-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-bottom: var(--card-gap);
}

.list-view__toolbar-total {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.list-view__ai-trigger {
  /* Typographic */
  color: var(--color-ai);
}

.list-view__ai-action {
  margin-bottom: var(--spacing-sm);
}

@media (width < 768px) {
  .list-view__toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .list-view__toolbar-total {
    width: 100%;
  }
}
</style>
