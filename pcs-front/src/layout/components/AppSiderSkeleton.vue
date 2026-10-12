<template>
  <a-skeleton
    class="app-sider-skeleton"
    :class="{ 'app-sider-skeleton--collapsed': collapsed }"
    :animation="true"
    role="status"
    aria-label="导航加载中"
    aria-busy="true"
  >
    <div class="app-sider-skeleton__items">
      <div v-for="(width, index) in labelWidths" :key="index" class="app-sider-skeleton__item">
        <a-skeleton-shape class="app-sider-skeleton__icon" shape="circle" size="16px" />
        <div v-if="!collapsed" class="app-sider-skeleton__label">
          <a-skeleton-line :rows="1" :widths="[width]" :line-height="14" />
        </div>
      </div>
    </div>
  </a-skeleton>
</template>

<script setup lang="ts">
/**
 * 页面首次初始化时的侧边导航骨架。
 *
 * 行高、内边距和图标尺寸均与 AppSider 菜单保持一致，避免菜单数据就绪时发生横向跳变；
 * 折叠态仅保留居中图标占位，展开态同时呈现图标和不同长度的标题占位。
 */
interface Props {
  collapsed?: boolean
}

withDefaults(defineProps<Props>(), {
  collapsed: false,
})

const labelWidths = ['58%', '74%', '46%', '66%', '54%', '70%', '42%']
</script>

<style scoped>
.app-sider-skeleton {
  height: 100%;
  padding: var(--layout-sider-menu-inner-padding-x);
  background-color: var(--color-bg-card);
}

.app-sider-skeleton__items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.app-sider-skeleton__item {
  display: flex;
  align-items: center;
  min-height: 36px;
  gap: var(--spacing-md);
  padding: 0 var(--layout-sider-menu-padding-x);
}

.app-sider-skeleton__icon {
  flex: 0 0 auto;
}

.app-sider-skeleton__label {
  flex: 1;
  min-width: 0;
}

.app-sider-skeleton--collapsed {
  padding-right: var(--spacing-sm);
  padding-left: var(--spacing-sm);
}

.app-sider-skeleton--collapsed .app-sider-skeleton__item {
  justify-content: center;
  padding: 0;
}
</style>
