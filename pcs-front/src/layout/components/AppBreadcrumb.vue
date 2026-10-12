<template>
  <a-breadcrumb class="app-breadcrumb" separator="/">
    <a-breadcrumb-item v-for="(crumb, index) in crumbs" :key="crumb.key">
      <!--
        a-breadcrumb-item 根为 Fragment，class/@click 无法落到文字节点上；
        交互与样式必须包在内部元素上。仅截断时启用 Tooltip。
      -->
      <a-tooltip :content="crumb.title" :disabled="!isOverflow(crumb.key)" position="top">
        <span
          :ref="(el) => bindItemEl(crumb.key, el)"
          class="app-breadcrumb__item"
          :class="{
            'app-breadcrumb__item--link': index < crumbs.length - 1,
            'app-breadcrumb__item--current': index === crumbs.length - 1,
          }"
          @mouseenter="measureItem(crumb.key)"
          @click="onClickCrumb(crumb, index)"
        >
          {{ crumb.title }}
        </span>
      </a-tooltip>
    </a-breadcrumb-item>
  </a-breadcrumb>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, watch } from 'vue'
import { useRoute, useRouter, type RouteRecordNormalized } from 'vue-router'

interface Crumb {
  key: string
  path: string
  title: string
  name?: RouteRecordNormalized['name']
}

const route = useRoute()
const router = useRouter()

/** 含 meta.title 的匹配层级；末级为当前页 */
const crumbs = computed<Crumb[]>(() =>
  route.matched
    .filter((record) => record.meta?.title)
    .map((record) => ({
      key: String(record.name ?? record.path),
      path: record.path,
      title: record.meta.title as string,
      name: record.name,
    })),
)

const itemEls = new Map<string, HTMLElement>()
/** 仅 scrollWidth > clientWidth 时为 true，才允许 Tooltip */
const overflowMap = reactive<Record<string, boolean>>({})

function isOverflow(key: string): boolean {
  return Boolean(overflowMap[key])
}

function bindItemEl(key: string, el: unknown) {
  if (!(el instanceof HTMLElement)) {
    itemEls.delete(key)
    return
  }
  itemEls.set(key, el)
  nextTick(() => measureItem(key))
}

function measureItem(key: string) {
  const el = itemEls.get(key)
  if (!el) {
    overflowMap[key] = false
    return
  }
  overflowMap[key] = el.scrollWidth > el.clientWidth + 1
}

function measureAll() {
  for (const key of itemEls.keys()) measureItem(key)
}

watch(
  crumbs,
  () => {
    nextTick(measureAll)
  },
  { flush: 'post' },
)

const onWinResize = () => measureAll()
window.addEventListener('resize', onWinResize)
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWinResize)
})

/** 末级不可点；上级跳到对应路由（优先 name，保证与侧栏/redirect 一致）*/
function onClickCrumb(crumb: Crumb, index: number) {
  if (index === crumbs.value.length - 1) return
  if (crumb.name != null) {
    if (crumb.name !== route.name) router.push({ name: crumb.name })
    return
  }
  if (crumb.path !== route.path) router.push(crumb.path)
}
</script>

<style scoped>
/*
 * 面包屑：12/400、行高 18；可点 #9DA3AE、hover 主色；
 * 末级 #4B5564 不可点；分隔符 / #C0C4CC、间距 8px；单行、超长 160 省略；
 * Tooltip 仅在文案截断时出现。
 */
.app-breadcrumb {
  display: inline-flex;
  align-items: center;

  max-width: 100%;
  height: 18px;
  overflow: hidden;

  font-size: var(--font-size-xs); /* 12px */
  font-weight: var(--font-weight-regular); /* 400 */
  line-height: 18px;
  white-space: nowrap;
}

.app-breadcrumb :deep(.arco-breadcrumb-item) {
  padding: 0;

  font-size: inherit;
  font-weight: inherit;
  line-height: 18px;
}

.app-breadcrumb :deep(.arco-breadcrumb-item:last-child) {
  font-weight: var(--font-weight-regular);
}

.app-breadcrumb__item {
  display: inline-block;

  max-width: 160px;
  overflow: hidden;

  font-size: inherit;
  font-weight: inherit;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

/* 可点击项 default：#9DA3AE；hover：主色（完整文案时仅高亮，不弹 Tip） */
.app-breadcrumb__item--link {
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--duration-state) var(--ease-state);
}

.app-breadcrumb__item--link:hover {
  color: var(--color-primary);
}

/* 当前页（末级）：#4B5564，不可点、无 hover */
.app-breadcrumb__item--current {
  color: var(--color-text-body);
  cursor: default;
}

.app-breadcrumb__item--current:hover {
  color: var(--color-text-body);
}

/* 分隔符：/ · #C0C4CC · 与项间距 8px */
.app-breadcrumb :deep(.arco-breadcrumb-item-separator) {
  margin: 0 var(--spacing-sm); /* 8px */

  color: var(--color-text-placeholder); /* #C0C4CC */
  font-size: inherit;
  font-weight: inherit;
  line-height: 18px;
}
</style>
