<template>
  <section class="section">
    <h2 class="section__title">② 输入框 Input</h2>

    <ByCard title="验证态与禁用态" class="section__card">
      <a-form :model="inputModel" class="input-form" layout="vertical">
        <div class="input-grid">
          <div class="input-grid__item">
            <a-form-item
              field="value"
              label="必填 required"
              required
              :rules="[{ required: true, message: '请输入内容' }]"
              :validate-trigger="['input', 'blur']"
            >
              <a-input v-model="inputModel.value" placeholder="请输入" />
            </a-form-item>
          </div>
          <div class="input-grid__item">
            <a-form-item label="禁用 disabled">
              <a-input placeholder="请输入" disabled />
            </a-form-item>
          </div>
        </div>
      </a-form>
    </ByCard>

    <a-alert type="warning" show-icon>必填项为空时触发表单校验；禁用态文字走 --color-text-secondary 且不可输入；宽度跟随容器自适应。</a-alert>

    <PropsDoc :groups="INPUT_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { ByCard } from '@baiyun/template-core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { INPUT_PROP_GROUPS } from '../propDoc'

const inputModel = reactive({ value: '' })

const code = `<a-form :model="model">
  <a-form-item
    field="value"
    label="名称"
    required
    :rules="[{ required: true, message: '请输入内容' }]"
    :validate-trigger="['input', 'blur']"
  >
    <a-input v-model="model.value" placeholder="请输入" />
  </a-form-item>
</a-form>
<a-input placeholder="请输入" disabled />`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.input-grid__item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.input-grid__item :deep(.arco-form-item) {
  margin-bottom: 0;
}

@media (width <= 767px) {
  .input-grid {
    grid-template-columns: 1fr;
  }
}
</style>
