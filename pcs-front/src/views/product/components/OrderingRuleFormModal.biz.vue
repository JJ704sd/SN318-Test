<template>
  <ByModal
    v-model:visible="visible"
    :title="title"
    mode="form-double"
    @confirm="onSubmit"
  >
    <ByForm ref="formRef" :model="form" :cols="2" :max-width="false">
      <div class="by-form-span-2 ordering-rule-form__banner">
        <b>规则口径</b>：全局规则供所有服务单元勾选；指定服务单元规则只对该单元生效，用于渠道专属国家限制、重量尺寸上限等。
      </div>

      <a-form-item
        field="name"
        label="规则名称"
        required
        :rules="[{ required: true, message: '请填写规则名称' }]"
      >
        <a-input v-model="form.name" placeholder="如 关税预付" allow-clear />
      </a-form-item>
      <a-form-item
        field="code"
        label="规则编码"
        required
        :rules="[{ required: true, message: '请填写规则编码' }]"
      >
        <a-input v-model="form.code" placeholder="如 duty_prepaid" allow-clear />
      </a-form-item>

      <a-form-item field="scope" label="适用范围" required>
        <a-select v-model="form.scope">
          <a-option v-for="option in SCOPE_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </a-option>
        </a-select>
      </a-form-item>
      <a-form-item
        v-if="form.scope === 'unit'"
        field="scopeUnitCode"
        label="指定服务单元"
        required
        :rules="[{ required: true, message: '请选择指定服务单元' }]"
      >
        <a-select v-model="form.scopeUnitCode" placeholder="请选择服务单元">
          <a-option v-for="unit in props.units" :key="unit.code" :value="unit.code">
            {{ unit.code }} {{ unit.name }}
          </a-option>
        </a-select>
      </a-form-item>

      <a-form-item field="type" label="规则类型">
        <a-select v-model="form.type" @change="onTypeChange">
          <a-option v-for="type in RULE_TYPES" :key="type" :value="type">{{ type }}</a-option>
        </a-select>
      </a-form-item>
      <a-form-item field="action" label="处理方式">
        <a-select v-model="form.action">
          <a-option v-for="action in RULE_ACTIONS" :key="action" :value="action">{{ action }}</a-option>
        </a-select>
      </a-form-item>

      <a-form-item
        field="expression"
        label="条件表达式"
        required
        class="by-form-span-2"
        :rules="[{ required: true, message: '请填写条件表达式' }]"
      >
        <a-input
          v-model="form.expression"
          placeholder="如 dutyPrepaid == true"
          allow-clear
        />
      </a-form-item>

      <a-form-item field="description" label="说明">
        <a-input v-model="form.description" placeholder="如 涉及关税预付时按下单限制校验" allow-clear />
      </a-form-item>
      <a-form-item field="status" label="状态">
        <a-select v-model="form.status">
          <a-option value="enabled">启用</a-option>
          <a-option value="disabled">停用</a-option>
        </a-select>
      </a-form-item>
    </ByForm>
  </ByModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ByForm, ByModal } from '@core/components'
import type { OrderingRuleItem } from '@/api/service-unit/ordering-rule'

/** 规则类型：取值即中文标签，与 mock 数据的 type 字段口径一致 */
const RULE_TYPES = ['关税预付', '香港交货', '超大件', '是否带电', '自定义']
/** 命中规则后的处理方式 */
const RULE_ACTIONS = ['拒收', '转人工']

const SCOPE_OPTIONS = [
  { value: 'global', label: '全局规则' },
  { value: 'unit', label: '指定服务单元' },
]

/** 类型 → 默认条件表达式 / 处理方式 / 说明；切换类型时据此联动 */
const TYPE_TEMPLATES: Record<string, { expression: string; action: string; description: string }> = {
  关税预付: { expression: 'dutyPrepaid == true', action: '拒收', description: '涉及关税预付时按下单限制校验' },
  香港交货: { expression: 'deliveryPoint == "HK"', action: '拒收', description: '涉及香港交货时按下单限制校验' },
  超大件: { expression: 'oversized == true', action: '转人工', description: '超大件需按规则校验或转人工' },
  是否带电: { expression: 'hasBattery == true', action: '拒收', description: '带电货接单限制' },
  自定义: { expression: '', action: '转人工', description: '' },
}

interface OrderingRuleFormModel {
  name: string
  code: string
  scope: 'global' | 'unit'
  scopeUnitCode: string
  type: string
  action: string
  expression: string
  description: string
  status: 'enabled' | 'disabled'
}

const visible = defineModel<boolean>('visible', { required: true })

const props = withDefaults(
  defineProps<{
    /** 弹框模式：create 新增 / edit 编辑 */
    mode?: 'create' | 'edit'
    /** 编辑模式回填用；新增模式不需要传 */
    record?: OrderingRuleItem | null
    /** 「指定服务单元」下拉的可选项，由列表页传入，避免重复取数 */
    units?: Array<{ code: string; name: string }>
  }>(),
  { mode: 'create', record: null, units: () => [] },
)

/** 编辑时标题带上规则名称，与原型一致 */
const title = computed(() =>
  props.mode === 'edit'
    ? `编辑下单限制规则${props.record ? ` · ${props.record.name}` : ''}`
    : '新增下单限制规则')

const formRef = ref<InstanceType<typeof ByForm>>()

const form = reactive<OrderingRuleFormModel>({
  name: '',
  code: '',
  scope: 'global',
  scopeUnitCode: '',
  type: '关税预付',
  action: '拒收',
  expression: '',
  description: '',
  status: 'enabled',
})

/** 类型联动：名称 / 表达式 / 说明只补空值，处理方式始终跟随类型 */
function applyTypeTemplate(type: string, overwriteName = false): void {
  const template = TYPE_TEMPLATES[type]
  if (!template) return
  if (overwriteName || !form.name.trim()) form.name = type
  if (!form.expression.trim()) form.expression = template.expression
  if (!form.description.trim()) form.description = template.description
  form.action = template.action
}

function onTypeChange(value: unknown): void {
  if (typeof value !== 'string') return
  applyTypeTemplate(value)
}

/** 每次打开都回填：编辑取记录，新增预填关税预付模板（与原型一致） */
function resetForm(): void {
  const record = props.mode === 'edit' ? props.record : null
  Object.assign(form, {
    name: record?.name ?? '',
    code: record?.code ?? '',
    scope: record?.scope === 'unit' ? 'unit' : 'global',
    scopeUnitCode: record?.scopeUnitCode ?? '',
    type: record?.type ?? '关税预付',
    action: record?.action ?? '拒收',
    expression: record?.expression ?? '',
    description: record?.description ?? '',
    status: record?.status ?? 'enabled',
  })
  if (!record) applyTypeTemplate('关税预付', true)
  formRef.value?.clearValidate()
}

async function onSubmit(): Promise<void> {
  const errors = await formRef.value?.validate()
  if (errors) return
  // 保存接口尚未接入：校验通过后直接关闭，暂不做持久化
  visible.value = false
}

watch(visible, (open) => {
  if (open) resetForm()
})
</script>

<style scoped>
/* 规则口径引导条：中性说明色，与原型一致 */
.ordering-rule-form__banner {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-text-body);
  background-color: var(--color-bg-surface);
  border: var(--border-default);
  border-radius: var(--border-radius-default);
}
</style>
