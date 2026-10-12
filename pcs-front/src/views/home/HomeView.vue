<template>
  <div class="home-view-page">
    <PageHeader type="compact" title="百运前端通用模板" />

    <div class="home-view">
    <section class="home-view__grid">
      <ByCard
        v-for="entry in entries"
        :key="entry.name"
        variant="interactive"
        class="home-view__card"
        @click="goEntry(entry.name)"
      >
        <div class="home-view__card-head">
          <component :is="entry.icon" :size="24" class="home-view__card-icon" />
          <h3 class="home-view__card-title">{{ entry.title }}</h3>
        </div>
        <p class="home-view__card-desc">{{ entry.desc }}</p>
        <a-button type="text" class="home-view__card-action" @click.stop="goEntry(entry.name)">
          查看
          <template #icon><icon-right /></template>
        </a-button>
      </ByCard>
    </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/layout/components/PageHeader.vue'
import { ByCard } from '@baiyun/template-core/components'
import {
  IconApps,
  IconDashboard,
  IconEdit,
  IconFile,
  IconList,
  IconRight,
} from '@arco-design/web-vue/es/icon'

interface Entry {
  name: string
  title: string
  desc: string
  icon: Component
}

const entries: Entry[] = [
  { name: 'demo-list', title: '列表页', desc: '运单管理：搜索/分页/批量/AI 建议', icon: IconList },
  { name: 'demo-detail', title: '详情页', desc: '运单详情：字段网格/轨迹/AI 摘要', icon: IconFile },
  { name: 'demo-form', title: '表单页', desc: '新建/编辑运单：校验/AI 预填', icon: IconEdit },
  { name: 'demo-dashboard', title: '仪表盘', desc: 'KPI + 图表 + 明细', icon: IconDashboard },
  { name: 'components', title: '基础组件', desc: '15 类组件手册：状态/用法/代码', icon: IconApps },
]

const router = useRouter()

function goEntry(name: string) {
  router.push({ name })
}
</script>

<style scoped>
/* 页面容器：transition 单根；左内边距由 basic-layout__content 提供 */
.home-view-page {
  display: flex;
  flex-direction: column;
}

/* PageHeader 通栏：负 margin 顶掉内容区左边距，与侧边栏零间隙 */
.home-view-page :deep(.page-header) {
  margin-left: calc(var(--layout-content-padding) * -1);
}

/* 承接内容区上/右/下内边距（Desktop 24 / Tablet 16 / Mobile 12，随断点 token） */
.home-view {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap); /* 首页模块与入口卡片区间距 */

  padding-top: var(--layout-content-padding);
  padding-right: var(--layout-content-padding);
  padding-bottom: var(--layout-content-padding);
}

.home-view__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--card-gap); /* 卡片间距：Desktop 16 / Tablet 12 / Mobile 8 */
}

.home-view__card {
  display: flex;
  flex-direction: column;
}

.home-view__card-head {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.home-view__card-icon {
  color: var(--color-primary);
}

.home-view__card-title {
  margin: 0;

  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.home-view__card-desc {
  flex: 1;
  margin: var(--spacing-sm) 0;

  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.home-view__card-action {
  align-self: flex-start;

  color: var(--color-primary);
}

@media (width <= 1279px) {
  .home-view__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 767px) {
  .home-view__grid {
    grid-template-columns: 1fr;
  }

  .home-view__card-action {
    justify-content: flex-start;
  }
}
</style>
