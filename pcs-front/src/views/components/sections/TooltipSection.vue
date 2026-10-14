<template>
  <section class="section">
    <h2 class="section__title">⑮ Tooltip 气泡提示</h2>

    <ByCard title="图标按钮必配 Tooltip" class="section__card">
      <a-space wrap>
        <ByIconButton tooltip="新增" type="primary" :tooltip-props="{ position: 'top' }">
          <icon-plus />
        </ByIconButton>
        <ByIconButton tooltip="编辑" :tooltip-props="{ position: 'bottom' }">
          <icon-edit />
        </ByIconButton>
        <ByIconButton tooltip="删除" status="danger" :tooltip-props="{ position: 'left' }">
          <icon-delete />
        </ByIconButton>
        <ByIconButton tooltip="查看" :tooltip-props="{ position: 'right' }">
          <icon-eye />
        </ByIconButton>
      </a-space>
      <p class="section__hint">纯图标无文字，用户无法得知功能，必须配 Tooltip 显示操作名称。</p>
    </ByCard>

    <ByCard title="文字截断 Tooltip" class="section__card">
      <a-tooltip content="深圳市百运科技有限公司 - 福田区华强北街道 88 号百运大厦 16 楼">
        <span class="text-ellipsis-1 tooltip-demo-text">
          深圳市百运科技有限公司 - 福田区华强北街道 88 号百运大厦 16 楼
        </span>
      </a-tooltip>
    </ByCard>

    <ByCard title="禁用态说明" class="section__card">
      <a-tooltip content="当前状态不可删除">
        <a-button type="text" status="danger" disabled>
          <template #icon><icon-delete /></template>
          删除
        </a-button>
      </a-tooltip>
      <p class="section__hint">禁用态元素可用 Tooltip 说明禁用原因；但图标按钮禁用态不显示 Tooltip（规范禁止项）。</p>
    </ByCard>

    <a-alert type="warning" show-icon>图标按钮必配；内容最多 3 行（多改 Popover）；Mobile 禁用改 Popover 或长按。</a-alert>

    <PropsDoc :groups="TOOLTIP_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard, ByIconButton } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { TOOLTIP_PROP_GROUPS } from '../propDoc'
import { IconPlus, IconEdit, IconDelete, IconEye } from '@arco-design/web-vue/es/icon'

const code = `<!-- 图标按钮必配 Tooltip：使用 ByIconButton，已内置 Tooltip -->
<ByIconButton tooltip="新增" type="primary" :tooltip-props="{ position: 'top' }">
  <icon-plus />
</ByIconButton>
<ByIconButton tooltip="编辑" :tooltip-props="{ position: 'bottom' }">
  <icon-edit />
</ByIconButton>
<ByIconButton tooltip="删除" status="danger" :tooltip-props="{ position: 'left' }">
  <icon-delete />
</ByIconButton>
<ByIconButton tooltip="查看" :tooltip-props="{ position: 'right' }">
  <icon-eye />
</ByIconButton>

<!-- 文字截断 Tooltip -->
<a-tooltip :content="fullText">
  <span class="text-ellipsis-1">{{ fullText }}</span>
</a-tooltip>`
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

.tooltip-demo-text {
  display: inline-block;
  width: 240px;

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}
</style>
