<template>
  <div class="drawer-detail">
    <!-- ① 基础信息区：可选 AI 只读摘要 + 字段网格（默认一行 3 字段） -->
    <AiSummaryCard
      v-if="aiEmbeddedOn && summaryContext"
      :context="summaryContext"
      class="drawer-detail__ai"
    />

    <ByCard variant="outlined">
      <section class="drawer-detail__basic">
        <DetailField label="运单号" :value="detail.waybillNo" />
        <DetailField label="业务类型">
          <ByBizTag :type="detail.bizType" />
        </DetailField>
        <DetailField label="当前状态">
          <ByStatusTag
            :status="STATUS_TYPE_MAP[detail.status]"
            :text="STATUS_LABEL[detail.status]"
            size="small"
          />
        </DetailField>
        <DetailField label="发件人" :value="detail.sender" />
        <DetailField label="收件人" :value="detail.consignee" />
        <DetailField label="目的地" :value="detail.destination" />
        <DetailField label="重量" :value="formatWeight(detail.weight)" />
        <DetailField label="金额" :value="formatMoney(detail.amount)" />
        <DetailField label="创建时间" :value="formatDateTime(detail.createdAt)" />
      </section>
    </ByCard>

    <!-- ② 预警提示条：仅在有异常时渲染，独占一行，位于基础信息区与分组卡片之间 -->
    <a-alert
      v-if="detail.warning"
      :type="detail.warning.type"
      show-icon
      class="drawer-detail__alert"
    >
      {{ detail.warning.message }}
      <template v-if="detail.warning.actionLabel" #action>
        <a-button
          size="mini"
          :type="detail.warning.type === 'error' ? 'primary' : 'text'"
          @click="onHandleAction"
        >
          {{ detail.warning.actionLabel }}
        </a-button>
      </template>
    </a-alert>

    <!-- ③ 分组卡片区：左列 货物信息+状态追踪 垂直堆叠，右列 联系信息；底部 备注 整行 -->
    <a-row :gutter="[16, 16]" class="drawer-detail__groups">
      <a-col :md="12" :xs="24">
        <div class="drawer-detail__stack">
          <ByCard title="货物信息" variant="outlined">
            <div class="drawer-detail__group-fields">
              <DetailField label="重量" :value="formatWeight(detail.weight)" />
              <DetailField label="金额" :value="formatMoney(detail.amount)" />
            </div>
          </ByCard>
          <ByCard title="状态追踪" variant="outlined">
            <div class="drawer-detail__group-fields">
              <DetailField label="业务类型">
                <ByBizTag :type="detail.bizType" />
              </DetailField>
              <DetailField label="当前状态">
                <ByStatusTag
                  :status="STATUS_TYPE_MAP[detail.status]"
                  :text="STATUS_LABEL[detail.status]"
                  size="small"
                />
              </DetailField>
              <DetailField label="创建时间" :value="formatDateTime(detail.createdAt)" />
            </div>
          </ByCard>
        </div>
      </a-col>
      <a-col :md="12" :xs="24">
        <ByCard title="联系信息" variant="outlined">
          <div class="drawer-detail__group-fields">
            <DetailField label="发件人" :value="detail.sender" />
            <DetailField label="收件人" :value="detail.consignee" />
            <DetailField label="目的地" :value="detail.destination" />
          </div>
        </ByCard>
      </a-col>
      <a-col :span="24">
        <ByCard title="备注" variant="outlined">
          <DetailField
            label="备注信息"
            :value="detail.remark || EMPTY_TEXT"
            :clamp="2"
          />
        </ByCard>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { ByCard, ByStatusTag, ByBizTag, DetailField } from '@core/components'
import { formatMoney, formatWeight, formatDateTime, EMPTY_TEXT } from '@core/utils'
import { env } from '@core/config'
import type { WaybillDrawerDetail, WaybillDrawerWarning } from '@/api/demo'
import { STATUS_LABEL, STATUS_TYPE_MAP } from '../config/detailConfig'

interface Props {
  detail: WaybillDrawerDetail
}
const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'handle-action', warning: WaybillDrawerWarning): void
}>()

const summaryContext = computed<Record<string, string>>(() => ({
  运单号: props.detail.waybillNo,
  状态: STATUS_LABEL[props.detail.status],
  目的地: props.detail.destination,
  金额: formatMoney(props.detail.amount),
}))

// AI 内嵌摘要：仅 aiEnabled && aiEmbeddedEnabled 时经 /ai/embedded 子入口异步加载，关闭则不请求
const aiEmbeddedOn = env.aiEnabled && env.aiEmbeddedEnabled
const AiSummaryCard = aiEmbeddedOn
  ? defineAsyncComponent(() =>
      import('@core/ai/embedded').then((m) => m.AiSummaryCard),
    )
  : null

function onHandleAction() {
  if (props.detail.warning) emit('handle-action', props.detail.warning)
}
</script>

<style scoped>
.drawer-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg); /* §3 模块间距 lg，基础信息/预警条/分组卡为独立模块 */
  padding: var(--spacing-lg);
}

.drawer-detail__basic {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.drawer-detail__groups {
  /* a-row gutter 负 margin 在 flex 列里无法把 100% 宽撑开，需补一倍 gutter 才能与上方卡片左右齐平 */
  width: calc(100% + var(--grid-gutter));

  /* 父级 gap 24px，再上移 8px */
  margin-top: calc(var(--spacing-sm) * -1) !important;
}

.drawer-detail__stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.drawer-detail__group-fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

@media (width <= 767px) {
  .drawer-detail__basic {
    grid-template-columns: 1fr;
  }
}
</style>
