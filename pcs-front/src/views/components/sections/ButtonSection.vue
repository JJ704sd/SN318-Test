<template>
  <section class="section">
    <h2 class="section__title">① 按钮 Button</h2>

    <ByCard title="四类按钮 × 状态" class="section__card">
      <div class="button-grid">
        <div class="button-grid__head">
          <span>类型 \ 状态</span>
          <span>默认 default</span>
          <span>禁用 disabled</span>
          <span>加载 loading</span>
        </div>
        <div v-for="row in buttonRows" :key="row.key" class="button-grid__row">
          <span class="button-grid__label">{{ row.label }}</span>
          <span><a-button :type="row.type" :status="row.danger ? 'danger' : undefined">按钮</a-button></span>
          <span><a-button :type="row.type" :status="row.danger ? 'danger' : undefined" disabled>按钮</a-button></span>
          <span><a-button :type="row.type" :status="row.danger ? 'danger' : undefined" loading>按钮</a-button></span>
        </div>
      </div>
      <p class="section__hint">悬浮 hover / 点击 active 为交互态，色值走主题色阶（primary 600/800/900），过渡 100ms linear。</p>
    </ByCard>

    <ByCard title="图标按钮（必配 Tooltip）" class="section__card">
      <a-space wrap>
        <ByIconButton tooltip="新增" type="primary">
          <icon-plus />
        </ByIconButton>
        <ByIconButton tooltip="编辑">
          <icon-edit />
        </ByIconButton>
        <ByIconButton tooltip="删除" status="danger">
          <icon-delete />
        </ByIconButton>
        <ByIconButton tooltip="删除（禁用）" status="danger" disabled>
          <icon-delete />
        </ByIconButton>
      </a-space>
    </ByCard>

    <ByCard title="图标 + 文字按钮" class="section__card">
      <a-space wrap>
        <a-button type="primary">
          <template #icon><icon-plus /></template>
          新增
        </a-button>
        <a-button>
          <template #icon><icon-export /></template>
          导出
        </a-button>
        <a-button type="text" status="danger">
          <template #icon><icon-delete /></template>
          删除
        </a-button>
        <a-button type="text">
          <template #icon><icon-settings /></template>
          设置
        </a-button>
        <a-button type="text" disabled>
          <template #icon><icon-settings /></template>
          设置（禁用）
        </a-button>
      </a-space>
    </ByCard>

    <ByCard title="三档尺寸" class="section__card">
      <a-space wrap>
        <a-button type="primary" size="mini">小 24px</a-button>
        <a-button type="primary" size="medium">默认 32px</a-button>
        <a-button type="primary" size="large">大 40px</a-button>
      </a-space>
    </ByCard>

    <a-alert type="warning" show-icon>主要按钮每区域最多 1 个；图标按钮必配 Tooltip；Mobile 竖排铺满宽度。</a-alert>

    <PropsDoc :groups="BUTTON_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard, ByIconButton } from '@baiyun/template-core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { BUTTON_PROP_GROUPS } from '../propDoc'
import {
  IconPlus,
  IconEdit,
  IconDelete,
  IconExport,
  IconSettings,
} from '@arco-design/web-vue/es/icon'

interface ButtonRow {
  key: string
  type: 'primary' | 'secondary' | 'text'
  label: string
  danger?: boolean
}

const buttonRows: ButtonRow[] = [
  { key: 'primary', type: 'primary', label: '主要 Primary' },
  { key: 'secondary', type: 'secondary', label: '次要 Secondary' },
  { key: 'text', type: 'text', label: '文字 Text' },
  { key: 'danger', type: 'primary', label: '危险 Danger', danger: true },
]

const code = `<a-button type="primary">主要按钮</a-button>
<a-button>次要按钮</a-button>
<a-button type="text">文字按钮</a-button>
<a-button type="primary" status="danger">危险按钮</a-button>

<!-- 图标按钮：使用 ByIconButton，已内置 Tooltip -->
<ByIconButton tooltip="新增" type="primary">
  <icon-plus />
</ByIconButton>

<ByIconButton tooltip="编辑">
  <icon-edit />
</ByIconButton>

<ByIconButton tooltip="删除" status="danger">
  <icon-delete />
</ByIconButton>

<ByIconButton tooltip="删除（禁用）" status="danger" disabled>
  <icon-delete />
</ByIconButton>

<!-- 图标 + 文字按钮：仍使用 a-button -->
<a-button type="primary">
  <template #icon><icon-plus /></template>
  新增
</a-button>
<a-button type="text" disabled>
  <template #icon><icon-settings /></template>
  设置（禁用）
</a-button>`
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

.button-grid {
  display: grid;
  grid-template-columns: 140px repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.button-grid__head,
.button-grid__row {
  display: contents;
}

.button-grid__head > span {
  padding: var(--spacing-xs) var(--spacing-sm);

  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.button-grid__row > span {
  display: flex;
  align-items: center;

  padding: var(--spacing-xs) var(--spacing-sm);
}

.button-grid__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

@media (width <= 767px) {
  .button-grid {
    grid-template-columns: 1fr;
  }

  .button-grid__head {
    display: none;
  }

  .button-grid__row {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) 0;
    border-bottom: var(--border-divider);
  }
}
</style>
