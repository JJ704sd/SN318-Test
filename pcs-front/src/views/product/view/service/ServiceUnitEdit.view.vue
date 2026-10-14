<template>
  <div class="service-unit-edit-view">
    <PageHeader
      type="full"
      :title="pageTitle"
    >
    </PageHeader>
    <ByCard class="service-unit-edit-view__card">
      <div class="service-unit-edit-view__section">基础信息</div>

      <a-form ref="formRef" :model="form" layout="vertical">
        <div class="service-unit-edit-view__grid">
          <a-form-item label="服务单元名称" field="name" required :rules="nameRules">
            <a-input v-model="form.name" placeholder="如：深圳-上门-揽收" :max-length="60" />
            <template #extra>
              格式：文本-文本-文本，仅支持文字、字母、数字及连接符 “-” 或 “—”，不支持其他标点符号。
            </template>
          </a-form-item>
          <a-form-item label="服务单元编码">
            <a-input :model-value="form.code" placeholder="保存后系统分配" disabled />
          </a-form-item>

          <a-form-item
            label="覆盖范围"
            field="coverage"
            required
            :rules="[{ required: true, message: '请选择覆盖范围' }]"
          >
            <a-select v-model="form.coverage" placeholder="请选择覆盖范围">
              <a-option v-for="option in COVERAGE_OPTIONS" :key="option.value" :value="option.value">
                {{ option.label }}
              </a-option>
            </a-select>
            <template #extra>选择该服务单元实际标签覆盖的服务段。</template>
          </a-form-item>

          <a-form-item
            label="服务商名称"
            field="providerCode"
            required
            class="service-unit-edit-view__grid--full"
            :rules="[{ required: true, message: '请选择服务商' }]"
          >
            <SupplierLookupSelect v-model="form.providerCode" placeholder="请选择服务商" />
            <template #extra>支持按服务商名称或编码搜索并单选。</template>
          </a-form-item>
        </div>

        <div class="service-unit-edit-view__grid service-unit-edit-view__grid--metrics">
          <a-form-item
            label="履约抛比"
            field="dimFactor"
            required
            :rules="[{ required: true, message: '请填写履约抛比' }]"
          >
            <a-input-number
              :model-value="form.dimFactor"
              :min="1"
              :step="1"
              placeholder="如：5000"
              @update:model-value="onDimFactorChange"
            />
            <template #extra>与 KG/CBM 互为换算：KG/CBM = 1000000 / 履约抛比。</template>
          </a-form-item>
          <a-form-item
            label="KG/CBM（自动换算）"
            field="kgPerCbm"
            required
            :rules="[{ required: true, message: '请填写 KG/CBM' }]"
          >
            <a-input-number
              :model-value="form.kgPerCbm"
              :min="1"
              :step="0.01"
              placeholder="如：200"
              @update:model-value="onKgCbmChange"
            />
          </a-form-item>
          <a-form-item label="每日负载容量">
            <div class="service-unit-edit-view__suffix">
              <a-input-number v-model="form.dailyCapacity" :min="0" placeholder="请输入" />
              <span class="service-unit-edit-view__suffix-unit">KG</span>
            </div>
          </a-form-item>
        </div>

        <a-form-item label="服务时间">
          <ServiceTimeEditor v-model="form.serviceSegments" />
        </a-form-item>

        <div class="service-unit-edit-view__grid service-unit-edit-view__grid--order-time">
          <a-form-item label="接单时间">
            <a-time-picker v-model="form.orderTime" format="HH:mm" placeholder="请选择接单时间" />
            <template #extra>维护每日开始接单的时间点。</template>
          </a-form-item>
          <a-form-item label="截单时间">
            <a-time-picker v-model="form.deadline" format="HH:mm" placeholder="请选择截单时间" />
            <template #extra>维护每日停止接单的时间点。</template>
          </a-form-item>
        </div>

        <a-form-item label="货物准入类型">
          <div class="service-unit-edit-view__goods">
            <a-checkbox-group v-model="form.goodsTypes" class="service-unit-edit-view__goods-group">
              <a-checkbox v-for="item in GOODS_TYPE_OPTIONS" :key="item.value" :value="item.value">
                {{ item.label }}
              </a-checkbox>
            </a-checkbox-group>
          </div>
          <template #extra>勾选该服务单元可承运的货物类型，未勾选的类型在下单时会被拦截。</template>
        </a-form-item>

        <a-form-item label="操作内容">
          <a-textarea
            v-model="form.operationContent"
            class="service-unit-edit-view__content"
            placeholder="可选，描述该服务单元的履约内容"
          />
        </a-form-item>

        <a-form-item label="下单限制">
          <div class="service-unit-edit-view__rule-block">
            <p class="service-unit-edit-view__rule-banner">
              下单时按已选规则校验是否可承运。规则表达式在「下单限制规则」中统一维护，此处只搜索和选择适用于当前服务单元的规则。
            </p>
            <OrderRulePicker v-model="form.orderRules" />
          </div>
        </a-form-item>
      </a-form>

      <div class="service-unit-edit-view__footer">
        <a-button @click="onCancel">取消</a-button>
        <a-button type="primary" @click="onSave">保存</a-button>
      </div>
    </ByCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance } from '@arco-design/web-vue'
import { ByCard, errorMsg } from '@core/components'
import { dimFactorToKgCbm, getServiceUnit, kgCbmToDimFactor } from '@/api/service-unit/service-unit'
import PageHeader from '@/layout/components/PageHeader.vue'
import OrderRulePicker from '@/views/product/components/OrderRulePicker.biz.vue'
import ServiceTimeEditor, {
  validateServiceSegments,
  type ServiceSegment,
} from '@/views/product/components/ServiceTimeEditor.biz.vue'
import SupplierLookupSelect from '@/views/product/components/SupplierLookupSelect.biz.vue'
import { COVERAGE_OPTIONS, GOODS_TYPE_OPTIONS } from '@/views/product/serviceUnitOptions'

const route = useRoute()
const router = useRouter()

/** 路径带 code 即编辑态（据此切换标题与回填），不带为新建 */
const editingCode = computed(() => (typeof route.params.code === 'string' ? route.params.code : ''))
/** 编辑态标题后缀取记录名称，不跟随表单实时变化 */
const editingName = ref('')
const pageTitle = computed(() =>
  editingCode.value
    ? `编辑服务单元${editingName.value ? ` · ${editingName.value}` : ''}`
    : '新建服务单元')

interface ServiceUnitForm {
  name: string
  code: string
  coverage: string | undefined
  /** 服务商编码：由供应商下拉回填，展示名称由组件 label 承载 */
  providerCode: string | undefined
  /** 履约抛比（体积重除数）：与 KG/CBM 互为换算，KG/CBM = 1000000 / 抛比 */
  dimFactor: number | undefined
  kgPerCbm: number | undefined
  dailyCapacity: number | undefined
  serviceSegments: ServiceSegment[]
  orderTime: string
  deadline: string
  /** 货物准入类型：多选标签值数组 */
  goodsTypes: string[]
  operationContent: string
  /** 下单限制：多选规则编码数组 */
  orderRules: string[]
}

const form = reactive<ServiceUnitForm>({
  name: '',
  code: '',
  coverage: undefined,
  providerCode: undefined,
  dimFactor: undefined,
  kgPerCbm: undefined,
  dailyCapacity: undefined,
  // 默认一行：周一 09:00—18:00；增删行与星期多选由 ServiceTimeEditor 维护
  serviceSegments: [{ days: ['周一'], start: '09:00', end: '18:00' }],
  orderTime: '',
  deadline: '',
  // 货物准入类型 / 下单限制均为多选，分别存标签值与规则编码
  goodsTypes: [],
  operationContent: '',
  orderRules: [],
})

const formRef = ref<FormInstance>()

/** 名称格式：文本-文本-文本，每段仅文字 / 字母 / 数字（与原型同一条正则）。 */
const NAME_PATTERN = /^[\p{L}\p{N}]+[-—][\p{L}\p{N}]+[-—][\p{L}\p{N}]+$/u

/** 名称校验：必填 + 格式；编辑态未改名时豁免格式校验，兼容历史数据（与原型一致）。 */
const nameRules = computed(() => [
  { required: true, message: '请输入服务单元名称' },
  {
    validator: (value: string, callback: (error?: string) => void): void => {
      if (editingCode.value && value === editingName.value) return callback()
      if (NAME_PATTERN.test(value ?? '')) return callback()
      callback('服务单元名称须为「文本-文本-文本」，仅支持文字、字母、数字及连接符')
    },
  },
])

/** 编辑态按编码取记录并回填整张表单；新建态保持默认值。 */
async function loadRecord(): Promise<void> {
  if (!editingCode.value) return
  const record = await getServiceUnit(editingCode.value)
  if (!record) return

  editingName.value = record.name
  form.name = record.name
  form.code = record.code
  form.coverage = record.coverage || undefined
  form.providerCode = record.providerCode || undefined
  const kgPerCbm = Number(record.kgPerCbm)
  if (Number.isFinite(kgPerCbm)) {
    form.kgPerCbm = kgPerCbm
    // 履约抛比不单独存，按换算公式从 KG/CBM 反算，保证与列表 / 详情展示一致
    form.dimFactor = kgCbmToDimFactor(kgPerCbm)
  }
  const dailyCapacity = Number(record.dailyCapacity)
  if (Number.isFinite(dailyCapacity)) form.dailyCapacity = dailyCapacity
  form.orderTime = record.orderTime
  form.deadline = record.deadline ?? ''
  form.serviceSegments = record.serviceSegments?.map((segment) => ({ ...segment })) ?? []
  form.goodsTypes = [...(record.goodsTypes ?? [])]
  form.operationContent = record.operationContent ?? ''
  form.orderRules = [...(record.orderRuleCodes ?? [])]
}

onMounted(() => {
  void loadRecord()
})

function onCancel(): void {
  void router.push({ name: 'service-unit' })
}

/** 履约抛比改动 → 同步 KG/CBM（两侧任一改动都按同一公式反算另一侧，与原型一致）。 */
function onDimFactorChange(value: number | undefined): void {
  form.dimFactor = value
  if (typeof value === 'number' && value > 0) form.kgPerCbm = dimFactorToKgCbm(value)
}

function onKgCbmChange(value: number | undefined): void {
  form.kgPerCbm = value
  if (typeof value === 'number' && value > 0) form.dimFactor = kgCbmToDimFactor(value)
}

async function onSave(): Promise<void> {
  const errors = await formRef.value?.validate()
  if (errors) return
  const segmentError = validateServiceSegments(form.serviceSegments)
  if (segmentError) {
    errorMsg(segmentError)
    return
  }
  // 保存接口尚未接入：校验通过后回到列表
  void router.push({ name: 'service-unit' })
}
</script>

<style scoped>
.service-unit-edit-view {
  display: flex;
  flex-direction: column;
  min-width: 0;

  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
}

.service-unit-edit-view__card {
  width: 100%;

  /* 顶部留出页面底色，避免页头白底与卡片白底直接相接（看着像没间隙）；
     左右与底部对齐同域列表页内容区的内边距 */
  margin: var(--card-padding) var(--layout-content-padding) var(--spacing-2xl) 0;
}

.service-unit-edit-view__card :deep(.by-card__body) {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.service-unit-edit-view__section {
  padding-bottom: var(--spacing-sm);

  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-h3);
  color: var(--color-text-title);
  border-bottom: 1px solid var(--color-divider);
}

.service-unit-edit-view__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-xl);
}

.service-unit-edit-view__grid--metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.service-unit-edit-view__grid--full {
  grid-column: 1 / -1;
}

/* 接单/截单时间铺满所在列：Arco 单值 Picker 按内容自适应（.arco-picker 未声明 width），
   且其根节点挂在 Trigger 的 Fragment 上（父级 scope 属性与 class 都到不了 .arco-picker），
   故只能在容器上用 :deep 命中内部 Picker 根节点 */
.service-unit-edit-view__grid--order-time :deep(.arco-picker) {
  width: 100%;
}

/* 货物准入类型：浅灰圆角容器内 5 列复选（复刻设计图），窄屏逐档收敛列数 */
.service-unit-edit-view__goods {
  padding: var(--spacing-md);

  background-color: var(--color-bg-surface);
  border-radius: var(--border-radius-default);
}

.service-unit-edit-view__goods-group {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--spacing-sm) var(--spacing-md);
}

/* 操作内容文本域：留出设计图里的多行高度，允许纵向拖拽 */
.service-unit-edit-view__content {
  min-height: 88px;
  resize: vertical;
}

@media (width <= 1279px) {
  .service-unit-edit-view__goods-group {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (width <= 767px) {
  .service-unit-edit-view__goods-group {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.service-unit-edit-view__suffix {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.service-unit-edit-view__suffix :deep(.arco-input-number) {
  flex: 1;
}

.service-unit-edit-view__suffix-unit {
  color: var(--color-text-secondary);
}

.service-unit-edit-view__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);

  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-divider);
}

/* 下单限制：默认插槽内纵向堆叠引导条与选择器，gap 显式控制间距，不依赖 Arco 内部 min-height */
.service-unit-edit-view__rule-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: 100%;
}

/* 引导条：规则统一维护在「下单限制规则」，此处只做选择引用 */
.service-unit-edit-view__rule-banner {
  padding: var(--spacing-sm) var(--spacing-md);
  margin: 0;
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-warning);
  background-color: var(--color-warning-bg);
  border: 1px solid var(--color-warning-border);
  border-radius: var(--border-radius-default);
}
</style>
