<template>
  <section class="section">
    <h2 class="section__title">⑫ Alert 提示框</h2>

    <ByCard title="页面级内联提示" class="section__card">
      <div class="alert-stack">
        <a-alert type="info" show-icon>系统将在今晚 22:00 进行例行维护。</a-alert>
        <a-alert type="success" show-icon>运单信息保存成功。</a-alert>
        <a-alert type="warning" show-icon>当前筛选条件未匹配到可导出的数据。</a-alert>
        <a-alert type="error" show-icon>数据加载失败，请稍后重试。</a-alert>
        <a-alert type="warning" title="配置项校验失败" show-icon closable>
          请根据字段下方的错误提示完成修正。
        </a-alert>
      </div>
      <p class="section__hint">页面内容流内嵌 / 持续可见 / 浅底无描边；需要用户关注时使用，不替代 Toast 或 Notification。</p>
    </ByCard>

    <a-alert type="warning" show-icon>
      Alert 用于页面级警告或持续关注的信息；一句话操作反馈使用 Toast，标题 + 正文的异步提醒使用 Notification。
    </a-alert>

    <PropsDoc :groups="ALERT_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { ALERT_PROP_GROUPS } from '../propDoc'

const code = `<a-alert type="info" show-icon>信息提示</a-alert>
<a-alert type="success" show-icon>成功提示</a-alert>
<a-alert type="warning" show-icon>警告提示</a-alert>
<a-alert type="error" show-icon>错误提示</a-alert>

<a-alert type="warning" title="配置项校验失败" show-icon closable>
  请根据字段下方的错误提示完成修正。
</a-alert>`
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

.alert-stack {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
</style>
