<template>
  <section class="section">
    <h2 class="section__title">④ 单选框 Radio</h2>

    <ByCard title="横排（默认必有预选）" class="section__card">
      <a-radio-group v-model="horizontal" type="radio">
        <a-radio value="express">快递</a-radio>
        <a-radio value="air">空运</a-radio>
        <a-radio value="sea">海运</a-radio>
      </a-radio-group>
    </ByCard>

    <ByCard title="竖排（选项文字较长或&gt;3 个）" class="section__card">
      <a-radio-group v-model="vertical" direction="vertical" type="radio">
        <a-radio value="express">快递（次日达）</a-radio>
        <a-radio value="air">空运（3-5 日达）</a-radio>
        <a-radio value="sea">海运（15-30 日达）</a-radio>
        <a-radio value="line">国际专线（7-10 日达）</a-radio>
      </a-radio-group>
    </ByCard>

    <ByCard title="状态规范" class="section__card">
      <div class="radio-states">
        <a-radio :model-value="false">默认未选中</a-radio>
        <a-radio :model-value="true">默认已选中</a-radio>
        <a-radio :model-value="false" disabled>禁用未选中</a-radio>
        <a-radio :model-value="true" disabled>禁用已选中</a-radio>
      </div>
      <p class="section__hint">圆形图标 16px；外圈描边 --color-border 未选 / --color-primary 选中（内圆 8px）；悬浮未选描边变主色。</p>
    </ByCard>

    <a-alert type="warning" show-icon>2-5 个选项，必有预选；超过 5 个改 Select；禁止用于多选场景。</a-alert>

    <PropsDoc :groups="RADIO_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ByCard } from '@baiyun/template-core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { RADIO_PROP_GROUPS } from '../propDoc'

const horizontal = ref('express')
const vertical = ref('air')

const code = `<a-radio-group v-model="value" type="radio">
  <a-radio value="express">快递</a-radio>
  <a-radio value="air">空运</a-radio>
  <a-radio value="sea">海运</a-radio>
</a-radio-group>

<!-- 竖排 -->
<a-radio-group v-model="value" direction="vertical" type="radio">
  <a-radio value="express">快递</a-radio>
</a-radio-group>`
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

.radio-states {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}
</style>
