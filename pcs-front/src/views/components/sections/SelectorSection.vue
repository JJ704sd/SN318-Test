<template>
  <section class="section">
    <h2 class="section__title">③ 选择器 Selector</h2>

    <ByCard title="Select 单选 / 多选" class="section__card">
      <div class="selector-grid">
        <div class="selector-grid__item">
          <span class="selector-grid__label">单选 Select</span>
          <a-select placeholder="请选择" :options="singleOptions" />
        </div>
        <div class="selector-grid__item">
          <span class="selector-grid__label">多选 Select（Tag 浅蓝底）</span>
          <a-select placeholder="请选择" multiple :options="singleOptions" />
        </div>
        <div class="selector-grid__item">
          <span class="selector-grid__label">filterable（选项&gt;10 必须开启）</span>
          <a-select placeholder="请选择" allow-search :options="manyOptions" />
        </div>
        <div class="selector-grid__item">
          <span class="selector-grid__label">禁用</span>
          <a-select placeholder="请选择" disabled :options="singleOptions" />
        </div>
      </div>
    </ByCard>

    <ByCard title="日期 / 时间选择器" class="section__card">
      <div class="selector-grid">
        <div class="selector-grid__item">
          <span class="selector-grid__label">DatePicker 日期</span>
          <a-date-picker disabled-input class="selector-grid__picker" />
        </div>
        <div class="selector-grid__item">
          <span class="selector-grid__label">DateTimePicker 日期时间</span>
          <a-date-picker show-time disabled-input class="selector-grid__picker" />
        </div>
        <div class="selector-grid__item">
          <span class="selector-grid__label">RangePicker 日期范围</span>
          <a-range-picker disabled-input class="selector-grid__picker" />
        </div>
        <div class="selector-grid__item">
          <span class="selector-grid__label">TimePicker 时间</span>
          <a-time-picker class="selector-grid__picker" />
        </div>
      </div>
    </ByCard>

    <ByCard title="数值区间（双 InputNumber，禁用 Slider）" class="section__card">
      <div class="range-input">
        <a-input-number placeholder="最小值" :min="0" />
        <span class="range-input__separator">-</span>
        <a-input-number placeholder="最大值" :min="0" />
      </div>
    </ByCard>

    <a-alert type="warning" show-icon>选项&gt;10 必须 filterable；多选 Tag 走 --color-info-bg/--color-info；数值区间用双 InputNumber，禁用 Slider。</a-alert>

    <PropsDoc :groups="SELECTOR_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard } from '@baiyun/template-core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { SELECTOR_PROP_GROUPS } from '../propDoc'

const singleOptions = [
  { label: '快递', value: 'express' },
  { label: '空运', value: 'air' },
  { label: '海运', value: 'sea' },
]

const manyOptions = Array.from({ length: 12 }, (_, i) => ({
  label: `选项 ${i + 1}`,
  value: String(i + 1),
}))

const code = `<a-select placeholder="请选择" :options="options" />
<a-select placeholder="请选择" multiple :options="options" />
<a-select placeholder="请选择" allow-search :options="manyOptions" />

<a-date-picker disabled-input class="full-width" />
<a-date-picker show-time disabled-input class="full-width" />
<a-range-picker disabled-input class="full-width" />
<a-time-picker class="full-width" />

<!-- 数值区间：双 InputNumber -->
<div class="range-input">
  <a-input-number placeholder="最小值" :min="0" />
  <a-input-number placeholder="最大值" :min="0" />
</div>`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.selector-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.selector-grid__item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.selector-grid__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

/* 与同列 DatePicker 等宽（覆盖主题 RangePicker fit-content / 10ch） */
.selector-grid__picker,
.selector-grid__item :deep(.arco-picker),
.selector-grid__item :deep(.arco-picker.arco-picker-range) {
  display: inline-flex;
  width: 100%;
}

/* 起止等分：开始靠左、结束靠右、箭头居中 */
.selector-grid__item :deep(.arco-picker-range .arco-picker-input) {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
}

.selector-grid__item :deep(.arco-picker-range .arco-picker-input > input) {
  width: 100%;
  min-width: 0;
}

.selector-grid__item :deep(.arco-picker-range .arco-picker-input:first-child > input) {
  text-align: left;
}

.selector-grid__item :deep(.arco-picker-range .arco-picker-separator + .arco-picker-input > input) {
  text-align: right;
}

.selector-grid__item :deep(.arco-picker-range .arco-picker-separator) {
  flex: none;
  padding: 0 var(--spacing-xs);
}

.selector-grid__item :deep(.arco-picker-range .arco-picker-separator::before) {
  content: '→';
}

.range-input {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.range-input__separator {
  color: var(--color-text-secondary);
}

@media (width <= 767px) {
  .selector-grid {
    grid-template-columns: 1fr;
  }
}
</style>
