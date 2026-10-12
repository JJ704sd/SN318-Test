<template>
  <div class="form-fields">
    <section v-if="isStepVisible(0)" class="form-fields__section">
      <h2 class="form-fields__title">基本信息</h2>
      <div class="form-fields__grid">
        <a-form-item field="bizType" label="业务类型" :rules="rules.bizType">
          <a-select v-model="draft.bizType" placeholder="请选择业务类型">
            <a-option v-for="opt in bizOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="destination" label="目的地" :rules="rules.destination">
          <a-input v-model="draft.destination" placeholder="请输入目的地" allow-clear />
        </a-form-item>
        <a-form-item field="shipDate" label="发货日期" :rules="rules.shipDate">
          <a-date-picker v-model="draft.shipDate" disabled-input placeholder="请选择发货日期" />
        </a-form-item>
      </div>
    </section>

    <section v-if="isStepVisible(1)" class="form-fields__section">
      <h2 class="form-fields__title">物流信息</h2>
      <div class="form-fields__grid">
        <a-form-item field="consignee" label="收件人" :rules="rules.consignee">
          <a-input v-model="draft.consignee" placeholder="请输入收件人" allow-clear />
        </a-form-item>
        <a-form-item field="consigneePhone" label="收件人电话" :rules="rules.consigneePhone">
          <a-input v-model="draft.consigneePhone" placeholder="请输入收件人电话" allow-clear />
        </a-form-item>
      </div>
    </section>

    <section v-if="isStepVisible(2)" class="form-fields__section">
      <h2 class="form-fields__title">费用信息</h2>
      <div class="form-fields__grid">
        <a-form-item field="weight" label="重量（KG）" :rules="rules.weight">
          <a-input-number
            v-model="draft.weight"
            :min="0"
            :precision="3"
            :step="0.1"
            placeholder="请输入重量"
          />
        </a-form-item>
        <a-form-item field="amount" label="金额（元）" :rules="rules.amount">
          <a-input-number
            v-model="draft.amount"
            :min="0"
            :precision="2"
            :step="1"
            placeholder="请输入金额"
          />
        </a-form-item>
        <a-form-item field="insured" label="是否保价">
          <a-switch v-model="draft.insured" />
        </a-form-item>
        <a-form-item field="attachments" label="附件" class="form-fields__span-2">
          <ByUpload
            v-model:file-list="fileList"
            mode="dragger"
            :accept="accept"
            :max-size="maxSize"
            :max-count="maxCount"
          />
        </a-form-item>
        <a-form-item field="remark" label="备注" class="form-fields__span-2">
          <a-textarea
            v-model="draft.remark"
            placeholder="请输入备注"
            :max-length="200"
            show-word-limit
          />
        </a-form-item>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FieldRule, FileItem } from '@arco-design/web-vue'
import { ByUpload } from '@baiyun/template-core/components'
import type { BizType } from '@baiyun/template-core/tokens'
import type { WaybillFormData } from '@/api/demo'

const props = withDefaults(
  defineProps<{
    /** 受控表单数据：组件内部以 draft 编辑，字段变更经 update:modelValue 回传（不直接改 prop） */
    modelValue: WaybillFormData
    rules: Record<string, FieldRule[]>
    bizOptions: Array<{ label: string; value: BizType }>
    accept: string
    maxSize: number
    maxCount: number
    /** stepped 模式下当前步（0/1/2）；single 模式传 -1 表示全部展示。 */
    activeStep?: number
  }>(),
  { activeStep: -1 },
)

const emit = defineEmits<{ (e: 'update:modelValue', value: WaybillFormData): void }>()

const fileList = defineModel<FileItem[]>('fileList', { required: true })

// 受控数据流：本地可写 draft 编辑字段，变化回传父组件；外部（加载/重置）改动经 deep watch 重置。
// 父值回填与本地编辑内容一致时不再写回，避免同步循环。
const draft = ref<WaybillFormData>({ ...props.modelValue })
const syncing = ref(false)

watch(
  () => props.modelValue,
  (next) => {
    if (next === draft.value) return
    if (JSON.stringify(next) !== JSON.stringify(draft.value)) {
      syncing.value = true
      draft.value = { ...next }
      syncing.value = false
    }
  },
  { deep: true },
)

watch(
  draft,
  (next) => {
    if (syncing.value) return
    if (JSON.stringify(next) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', { ...next })
    }
  },
  { deep: true },
)

function isStepVisible(step: number): boolean {
  return props.activeStep === -1 || props.activeStep === step
}
</script>

<style scoped>
.form-fields {
  display: flex;
  flex-direction: column;
}

.form-fields__section + .form-fields__section {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-xl);
  border-top: var(--border-divider);
}

.form-fields__title {
  margin: 0 0 var(--spacing-lg);

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-base);
  color: var(--color-text-title);
}

.form-fields__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-lg);
}

.form-fields__span-2 {
  grid-column: 1 / -1;
}

/* DatePicker / InputNumber 默认非 100% 宽，与同列 Select/Input 对齐 */
.form-fields__grid :deep(.arco-picker),
.form-fields__grid :deep(.arco-input-number) {
  width: 100%;
}

@media (width < 768px) {
  .form-fields__grid {
    grid-template-columns: 1fr;
  }

  .form-fields__span-2 {
    grid-column: auto;
  }
}
</style>
