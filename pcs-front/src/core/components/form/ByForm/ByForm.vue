<template>
  <div class="by-form" :class="rootClass" :style="rootStyle">
    <a-form ref="formRef" :model="model" layout="vertical" class="by-form__inner">
      <slot />
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Form as AForm } from '@arco-design/web-vue'

interface Props {
  model: Record<string, unknown>
  cols?: 1 | 2
  /** 表单区最大宽度；传 false 取消限制 */
  maxWidth?: number | false
}

const props = withDefaults(defineProps<Props>(), {
  cols: 1,
  maxWidth: 720,
})

const formRef = ref<InstanceType<typeof AForm>>()

const rootClass = computed(() => ({
  'by-form--double-col': props.cols === 2,
  'by-form--fluid': props.maxWidth === false,
}))

const rootStyle = computed(() =>
  props.maxWidth === false ? undefined : { '--by-form-max-width': `${props.maxWidth}px` },
)

async function validate() {
  const errors = await formRef.value?.validate()
  const firstField = errors && Object.keys(errors)[0]
  if (firstField) formRef.value?.scrollToField(firstField)
  return errors
}

async function validateFields(fields: string[]) {
  const errors = await formRef.value?.validateField(fields)
  const firstField = errors && Object.keys(errors)[0]
  if (firstField) formRef.value?.scrollToField(firstField)
  return errors
}

function resetFields() {
  return formRef.value?.resetFields()
}

function clearValidate() {
  return formRef.value?.clearValidate()
}

defineExpose({ validate, validateFields, resetFields, clearValidate })
</script>

<style scoped>
/*
 * ByForm 响应式壳（规范 §5.7 / 任务 2.9）：
 * 单列 max 720；双列 ≥1440 时 720 = 348 + 24 + 348；<1440 双列降为单列。
 * 字段名、必填星号、校验等视觉走 arco-theme 全局覆盖。
 */
.by-form {
  --by-form-max-width: 720px;

  width: 100%;
  max-width: var(--by-form-max-width);
  margin: 0;
}

.by-form--fluid {
  max-width: none;
}

.by-form__inner {
  display: flex;
  flex-direction: column;
  row-gap: var(--spacing-lg);
  width: 100%;
}

.by-form__inner :deep(.arco-form-item) {
  width: 100%;
  min-width: 0;
  margin-bottom: 0;
}

.by-form__inner :deep(.arco-form-item-wrapper-col),
.by-form__inner :deep(.arco-form-item-content),
.by-form__inner :deep(.arco-form-item-content-wrapper) {
  width: 100%;
}

/*
 * cols=2：
 * - 页面表单：≥1440 宽屏双列；<1440 保持单列（规范 §5.7）
 * - fluid（弹窗等）：始终双列，备注等用 .by-form-span-2 跨两列
 */
.by-form--fluid.by-form--double-col .by-form__inner {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-lg) var(--spacing-lg);
}

.by-form--fluid.by-form--double-col .by-form__inner :deep(.by-form-span-2) {
  grid-column: 1 / -1;
}

/* Mobile 全屏弹窗：双列降为单列 */
@media (width < 768px) {
  .by-form--fluid.by-form--double-col .by-form__inner {
    display: flex;
    flex-direction: column;
  }

  .by-form--fluid.by-form--double-col .by-form__inner :deep(.by-form-span-2) {
    grid-column: auto;
  }
}

@media (width >= 1440px) {
  .by-form--double-col:not(.by-form--fluid) .by-form__inner {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spacing-lg) var(--spacing-lg);
  }

  .by-form--double-col:not(.by-form--fluid) .by-form__inner :deep(.by-form-span-2) {
    grid-column: 1 / -1;
  }
}
</style>
