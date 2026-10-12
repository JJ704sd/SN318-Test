<template>
  <section class="section">
    <h2 class="section__title">⑤ 多选框 Checkbox</h2>

    <ByCard title="基础状态（方形 4 圆角）" class="section__card">
      <div class="checkbox-states">
        <a-checkbox>默认未选中</a-checkbox>
        <a-checkbox :model-value="true">默认已选中</a-checkbox>
        <a-checkbox :indeterminate="true">半选中 indeterminate</a-checkbox>
        <a-checkbox disabled>禁用未选中</a-checkbox>
        <a-checkbox disabled :model-value="true">禁用已选中</a-checkbox>
      </div>
      <p class="section__hint">方形 4 圆角；半选用于表格全选场景（当前页部分行已勾选）；表格行 Checkbox 不显示文字。</p>
    </ByCard>

    <ByCard title="分组（横排 / 竖排）" class="section__card">
      <div class="checkbox-group-wrap">
        <span class="checkbox-group__label">横排：</span>
        <a-checkbox-group v-model="horizontal">
          <a-checkbox value="express">快递</a-checkbox>
          <a-checkbox value="air">空运</a-checkbox>
          <a-checkbox value="sea">海运</a-checkbox>
        </a-checkbox-group>
      </div>
      <div class="checkbox-group-wrap">
        <span class="checkbox-group__label">竖排：</span>
        <a-checkbox-group v-model="vertical" direction="vertical">
          <a-checkbox value="express">快递（次日达）</a-checkbox>
          <a-checkbox value="air">空运（3-5 日达）</a-checkbox>
          <a-checkbox value="sea">海运（15-30 日达）</a-checkbox>
        </a-checkbox-group>
      </div>
    </ByCard>

    <ByCard title="全选 + 半选联动" class="section__card">
      <div class="checkbox-all">
        <a-checkbox
          :model-value="allChecked"
          :indeterminate="indeterminate"
          @change="onToggleAll"
        >
          全选（{{ checked.length }}/{{ options.length }}）
        </a-checkbox>
        <a-checkbox-group v-model="checked" class="checkbox-all__options">
          <a-checkbox v-for="opt in options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-checkbox>
        </a-checkbox-group>
      </div>
    </ByCard>

    <a-alert type="warning" show-icon>方形 4 圆角；半选用于全选场景；表格行 Checkbox 不显示文字；禁止用于互斥（互斥用 Radio）。</a-alert>

    <PropsDoc :groups="CHECKBOX_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ByCard } from '@baiyun/template-core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { CHECKBOX_PROP_GROUPS } from '../propDoc'

const horizontal = ref(['express'])
const vertical = ref(['air'])

const options = [
  { label: '快递', value: 'express' },
  { label: '空运', value: 'air' },
  { label: '海运', value: 'sea' },
  { label: '专线', value: 'line' },
]

const checked = ref<string[]>(['express', 'air'])

const allChecked = computed(
  () => checked.value.length === options.length && options.length > 0,
)
const indeterminate = computed(
  () => checked.value.length > 0 && checked.value.length < options.length,
)

function onToggleAll(checkedVal: boolean | (string | number | boolean)[]) {
  if (typeof checkedVal === 'boolean') {
    checked.value = checkedVal ? options.map((o) => o.value) : []
  }
}

const code = `<a-checkbox>未选中</a-checkbox>
<a-checkbox :model-value="true">已选中</a-checkbox>
<a-checkbox :indeterminate="true">半选中</a-checkbox>
<a-checkbox disabled>禁用</a-checkbox>

<!-- 全选 + 半选联动 -->
<a-checkbox
  :model-value="allChecked"
  :indeterminate="indeterminate"
  @change="onToggleAll"
>全选</a-checkbox>`
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

.checkbox-states {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.checkbox-group-wrap {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.checkbox-group__label {
  display: inline-block;
  padding-top: 4px;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.checkbox-all {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.checkbox-all__options {
  padding-left: var(--spacing-lg);
}
</style>
