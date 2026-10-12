<template>
  <div class="page-header" :class="`page-header--${type}`">
    <div class="page-header__main">
      <AppBreadcrumb v-if="showBreadcrumb" class="page-header__breadcrumb" />

      <h1 class="page-header__title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <p v-if="showSubtitle" class="page-header__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>
    </div>

    <div v-if="$slots.extra" class="page-header__extra">
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { useRoute } from 'vue-router'
import AppBreadcrumb from './AppBreadcrumb.vue'

type PageHeaderType = 'full' | 'standard' | 'compact'

const props = withDefaults(
  defineProps<{
    type?: PageHeaderType
    title?: string
    subtitle?: string
  }>(),
  {
    type: 'standard',
    title: '',
    subtitle: '',
  },
)

const slots = useSlots()
const route = useRoute()

// 仅有父级菜单的页面显示面包屑；一级菜单页面（如首页）不显示
const showBreadcrumb = computed(
  () =>
    props.type !== 'compact' &&
    route.matched.filter((record) => record.meta?.title).length > 1,
)

// 副标题仅 full 型渲染，避免 standard 型出现空节点导致高度抖动
const showSubtitle = computed(() => props.type === 'full' && (!!props.subtitle || !!slots.subtitle))
</script>

<style scoped>
.page-header {
  /* Positioning */
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  /* Box Model */
  box-sizing: border-box;

  /* 上下 20（§13 阶梯无 20px 档，就地派生）；左右 24 */
  padding: calc(var(--spacing-md) + var(--spacing-xs)) var(--spacing-lg) calc(var(--spacing-md) + var(--spacing-xs)) var(--spacing-lg);

  /* Visual */
  background-color: var(--color-bg-card);
}

.page-header--full {
  min-height: var(--page-header-height-full);
}

.page-header--standard {
  min-height: var(--page-header-height-standard);
}

.page-header--compact {
  min-height: var(--page-header-height-compact);
}

.page-header__breadcrumb {
  /* 大标题距面包屑底部 8px */
  margin-bottom: var(--spacing-sm);
}

.page-header__main {
  min-width: 0;
}

.page-header__title {
  /* Box Model */
  margin: 0;

  /* Typographic */
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-title);
}

.page-header__subtitle {
  /* Box Model - 副标题距大标题底部 4px */
  margin: var(--spacing-xs) 0 0;

  /* Typographic */
  font-size: var(--font-size-base);
  color: var(--color-text-body);
}

.page-header__extra {
  /* Positioning */
  display: flex;
  align-items: flex-end;

  /* Box Model */
  flex-shrink: 0;
  gap: var(--spacing-sm);
}

@media (width < 768px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .page-header__extra {
    width: 100%;
  }
}
</style>
