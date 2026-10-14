<template>
  <section class="section">
    <h2 class="section__title">⑨ 卡片 Card</h2>

    <ByCard title="默认卡片（仅白底）" class="section__card">
      <p class="card-demo-text">默认仅使用白底，不使用描边和阴影，也不响应 hover；用于列表区、仪表盘、详情内容区、表单内容区等页面主要内容区域。</p>
    </ByCard>

    <ByCard title="描边卡片（无 hover）" variant="outlined" class="section__card">
      <p class="card-demo-text">用于容器内部的信息分组，增加 1px 描边但不响应 hover。</p>
    </ByCard>

    <ByCard title="可交互卡片（仅此态有 hover）" variant="interactive" class="section__card">
      <div class="card-demo-grid">
        <ByCard variant="interactive" class="card-demo__item">
          <h3 class="card-demo__title">列表入口</h3>
          <p class="card-demo__desc">hover 时阴影发散 + translateY(-2px)，整卡可点击。</p>
        </ByCard>
        <ByCard variant="interactive" selected class="card-demo__item">
          <h3 class="card-demo__title">选中态</h3>
          <p class="card-demo__desc">主色描边 + 1px 主色外圈，用于已选项。</p>
        </ByCard>
      </div>
    </ByCard>

    <a-alert type="warning" show-icon>默认态仅白底；描边态无 hover；只有 interactive 态启用 hover、active、focus 和 selected 反馈。</a-alert>

    <PropsDoc :groups="CARD_PROP_GROUPS" />

    <CodeBlock :code="code" />
  </section>
</template>

<script setup lang="ts">
import { ByCard } from '@core/components'
import CodeBlock from '../CodeBlock.vue'
import PropsDoc from '../PropsDoc.vue'
import { CARD_PROP_GROUPS } from '../propDoc'

const code = `<!-- 默认：仅白底 -->
<ByCard title="基本信息">
  <p>纯展示内容</p>
</ByCard>

<!-- 默认：无 hover -->
<ByCard title="内容分组">
  <p>默认白底内容项</p>
</ByCard>

<!-- 可交互：只有此态有 hover -->
<ByCard variant="interactive" @click="onClick">
  <h3>列表入口</h3>
  <p>hover 阴影 + 上移</p>
</ByCard>

<!-- 选中态 -->
<ByCard variant="interactive" selected>
  <h3>已选中</h3>
</ByCard>`
</script>

<style scoped src="./section-shared.css"></style>

<style scoped>
.section__title {
  margin: 0;

  font-size: var(--font-size-h2);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.card-demo-text {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-body);
}

.card-demo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--card-gap);
}

.card-demo__title {
  margin: 0 0 var(--spacing-xs);

  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.card-demo__desc {
  margin: 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

@media (width <= 767px) {
  .card-demo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
