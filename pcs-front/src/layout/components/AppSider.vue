<template>
  <!-- 权限未加载完成时展示骨架，避免生成「永久空菜单」；加载/权限刷新后 computed 重算菜单 -->
  <AppSiderSkeleton v-if="!permissionStore.loaded" :collapsed="collapsed" />

  <a-menu
    v-else
    v-model:open-keys="openKeys"
    class="app-sider-menu"
    :collapsed="collapsed"
    :selected-keys="selectedKeys"
    :tooltip-props="MENU_TOOLTIP_PROPS"
    :trigger-props="MENU_TRIGGER_PROPS"
    :accordion="true"
    @menu-item-click="onMenuItemClick"
  >
    <template v-for="node in menuTree" :key="node.path">
      <a-sub-menu v-if="node.children?.length" :key="node.path">
        <template #icon>
          <component :is="node.icon" v-if="node.icon" />
        </template>
        <template #title>{{ node.title }}</template>
        <template v-for="child in node.children" :key="child.path">
          <a-sub-menu v-if="child.children?.length" :key="child.path">
            <template #title>{{ child.title }}</template>
            <a-menu-item
              v-for="leaf in child.children"
              :key="leaf.path"
              class="app-sider-menu__grandchild-item"
            >
              {{ leaf.title }}
            </a-menu-item>
          </a-sub-menu>

          <a-menu-item v-else :key="child.path" class="app-sider-menu__child-item">
            {{ child.title }}
          </a-menu-item>
        </template>
      </a-sub-menu>

      <a-menu-item v-else-if="!collapsed" :key="node.path">
        <template #icon>
          <component :is="node.icon" v-if="node.icon" />
        </template>
        <span class="app-sider-menu__leaf-item">{{ node.title }}</span>
      </a-menu-item>

      <a-tooltip v-else :content="node.title" v-bind="DIRECT_LEAF_TOOLTIP_PROPS">
        <button
          type="button"
          role="menuitem"
          class="arco-menu-item app-sider-menu__direct-leaf-item"
          :class="{
            'arco-menu-selected': selectedKeys.includes(node.path),
            'arco-menu-has-icon': !!node.icon,
          }"
          :aria-label="node.title"
          :aria-current="selectedKeys.includes(node.path) ? 'page' : undefined"
          @click="onMenuItemClick(node.path)"
        >
          <span class="arco-menu-icon">
            <component :is="node.icon" v-if="node.icon" />
          </span>
        </button>
      </a-tooltip>
    </template>
  </a-menu>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissionStore, useSiderStore } from '@core/stores'
import { useDevice } from '@core/composables'
import { buildMenuTree, findMenuAncestors, type MenuNode } from '@/layout/menu'
import AppSiderSkeleton from './AppSiderSkeleton.vue'

const permissionStore = usePermissionStore()
const siderStore = useSiderStore()
const route = useRoute()
const router = useRouter()
const { isDesktop } = useDevice()

// 菜单由路由表 + 权限 Store 过滤生成；改为 computed：依赖权限 Store 的
// loaded/resourceIds（经 can() 读取的 resourceSet），权限刷新后自动重算，不再是一次性快照。
const menuTree = computed(() => buildMenuTree())

// 折叠仅桌面常驻侧栏生效；<1280 抽屉内始终展开
const collapsed = computed(() => isDesktop.value && siderStore.siderCollapsed)

// 折叠态浮层（Flyout/Tooltip）延迟出现，防快速划过频繁弹出（规范 §04：100-200ms）
const MENU_POPUP_DURATION = { enter: 260, leave: 220 }
const MENU_TOOLTIP_PROPS = {
  mouseEnterDelay: 150,
  animationName: 'fade-in',
  duration: MENU_POPUP_DURATION,
  popupHoverStay: true,
  popupOffset: 12,
  contentClass: 'app-sider-menu__collapsed-tooltip',
  arrowClass: 'app-sider-menu__collapsed-tooltip-arrow',
}
const MENU_TRIGGER_PROPS = {
  mouseEnterDelay: 150,
  animationName: 'fade-in',
  duration: MENU_POPUP_DURATION,
  popupOffset: 4,
  showArrow: false,
}
const DIRECT_LEAF_TOOLTIP_PROPS = {
  position: 'right',
  mouseEnterDelay: 150,
  popupOffset: 14,
  showArrow: false,
  contentClass: 'app-sider-menu__direct-leaf-tooltip',
} as const

// 隐藏菜单项通过 activeMenu 归属到可见菜单，高亮与展开都基于该路径
const menuPath = computed(() => route.meta?.activeMenu || route.path)
const selectedKeys = computed(() => [menuPath.value])

// 父级展开跟随当前路由：初始与路由切换时自动展开选中项的祖先链，
// 确保子菜单被选中后父级 a-sub-menu 可见；用户手动展开/折叠由 v-model 同步
const openKeys = ref<string[]>(findMenuAncestors(menuTree.value, menuPath.value))

watch(menuPath, (newPath) => {
  const ancestors = findMenuAncestors(menuTree.value, newPath)
  if (ancestors.length) openKeys.value = ancestors
})

/** 判断某 path 是否仍是菜单节点（含子路径），用于清理权限刷新后失效的展开项 */
function menuHasPath(nodes: MenuNode[], path: string): boolean {
  return nodes.some(
    (n) => n.path === path || (n.children?.length && menuHasPath(n.children, path)),
  )
}

// 权限集合变化触发 menuTree 重算后，清掉已不存在的展开项（如切换到低权限账号）
watch(menuTree, (tree) => {
  openKeys.value = openKeys.value.filter((key) => menuHasPath(tree, key))
})

function onMenuItemClick(key: string) {
  if (key !== route.path) router.push(key)
  // 抽屉态选中后关闭抽屉（规范 §4.5）
  if (!isDesktop.value) siderStore.closeSiderDrawer()
}

</script>

<style scoped>
.app-sider-menu {
  /* Box Model */
  height: 100%;

  /* Visual */
  background-color: var(--color-bg-card);
}

/* 展开态：覆盖 Arco inner(8)，四向 16px，图标左缘 = 16 + 12 = 28 与顶栏折叠按钮图标对齐 */
.app-sider-menu :deep(.arco-menu-inner) {
  padding: var(--layout-sider-menu-inner-padding-x);
}

/* 桌面常驻侧栏（≥1280）折叠态：垂直 16 / 水平 8，图标左缘 = 8 + 12 = 20，在 56 折叠侧栏内居中；
 * 同时取消 Arco 折叠态固定宽 48，让菜单撑满侧栏（arco-menu-collapsed 类挂在菜单根元素上） */
@media (width >= 1280px) {
  .app-sider-menu.arco-menu-collapsed :deep(.arco-menu-inner) {
    padding: var(--layout-sider-menu-inner-padding-x) var(--spacing-sm);
  }

  .app-sider-menu.arco-menu-collapsed {
    width: auto;
  }

  /* 二级菜单不显示图标，补齐缩进后与一级菜单文字左缘对齐。 */
  .app-sider-menu:not(.arco-menu-collapsed) :deep(.app-sider-menu__child-item) {
    padding-left: calc(var(--layout-sider-menu-padding-x) * 2);
  }

  /* 三级菜单在二级基础上再加一档缩进 */
  .app-sider-menu:not(.arco-menu-collapsed) :deep(.app-sider-menu__grandchild-item) {
    padding-left: calc(var(--layout-sider-menu-padding-x) * 3);
  }
}

.app-sider-menu :deep(.arco-menu-item),
.app-sider-menu :deep(.arco-menu-inline-header),
.app-sider-menu :deep(.arco-menu-pop-header),
.app-sider-menu :deep(.arco-menu-group-title) {
  padding-right: var(--layout-sider-menu-padding-x);
  padding-left: var(--layout-sider-menu-padding-x);
}

/* 折叠态直达菜单使用原生按钮承载导航，复用 Arco 菜单视觉并清除按钮默认边框。 */
.app-sider-menu__direct-leaf-item {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 40px;
  min-height: 40px;
  padding: 0 var(--layout-sider-menu-padding-x);
  border: 0;
  font: inherit;
  line-height: 40px;
  text-align: left;
  appearance: none;
}

/* 菜单前置图标统一为 16px；展开/收起箭头属于 suffix，不跟随放大。 */
.app-sider-menu :deep(.arco-menu-item > .arco-menu-icon .arco-icon),
.app-sider-menu :deep(.arco-menu-inline-header > .arco-menu-icon .arco-icon),
.app-sider-menu :deep(.arco-menu-pop-header > .arco-menu-icon .arco-icon) {
  width: 16px;
  height: 16px;
}

/* 选中项：仅叶子菜单项主色浅底；父级 sub-menu 头（inline-header/pop-header）
 * Arco 在子级选中时也会挂 selected 类，但不给背景，保持仅文字高亮 */
.app-sider-menu :deep(.arco-menu-item.arco-menu-selected) {
  background-color: var(--color-primary-50);
}

/* 悬停项：主色浅底（覆盖 Arco 灰色 fill-2 hover 背景） */
.app-sider-menu :deep(.arco-menu-item:hover),
.app-sider-menu :deep(.arco-menu-inline-header:hover),
.app-sider-menu :deep(.arco-menu-pop-header:hover) {
  background-color: var(--color-primary-50);
}
</style>

<style>
/* 折叠态一级直达菜单 Tooltip 使用 14px 文案。 */
.arco-tooltip-content.app-sider-menu__direct-leaf-tooltip {
  font-size: var(--font-size-base);
}

/* 折叠态叶子菜单使用固定 160px 的白色名称面板，纯展示，不承载点击跳转。 */
.arco-tooltip-content.app-sider-menu__collapsed-tooltip {
  box-sizing: border-box;
  width: 160px;
  min-width: 160px;
  min-height: 54px;

  padding: var(--spacing-sm);

  background-color: var(--color-bg-card);
  border: var(--border-default);
  border-radius: var(--border-radius-default);
  box-shadow: var(--shadow-md);

  pointer-events: auto;
  cursor: default;
}

.arco-tooltip-content.app-sider-menu__collapsed-tooltip .app-sider-menu__leaf-item {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  padding: var(--spacing-sm) 8px;

  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  color: var(--color-text-title);
  font-weight: var(--font-weight-regular);
  white-space: nowrap;
  border-radius: var(--border-radius-default);
  transition:
    color var(--duration-state) var(--ease-state),
    background-color var(--duration-state) var(--ease-state);
  cursor: default;
}

.arco-tooltip-content.app-sider-menu__collapsed-tooltip .app-sider-menu__leaf-item:hover {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  background-color: var(--color-bg-surface);
  border-radius: var(--border-radius-default);
}

.arco-tooltip-popup-arrow.app-sider-menu__collapsed-tooltip-arrow {
  display: none;
}

/*
 * 折叠态有子菜单的浮层：固定 160px 宽度，菜单项与无子菜单提示面板使用同一套内边距、
 * 圆角与主色规则；选中项保持 500 字重，hover 使用浅色背景。
 */
.arco-trigger-menu {
  box-sizing: border-box;
  width: 160px;
  min-width: 160px;
  padding: var(--spacing-sm);
}

.arco-trigger-menu .arco-trigger-menu-item,
.arco-trigger-menu .arco-trigger-menu-pop-header {
  box-sizing: border-box;
  min-height: 36px;
  padding: var(--spacing-sm) 8px;
  border-radius: var(--border-radius-default);
  color: var(--color-text-title);
  background-color: transparent;
  line-height: var(--line-height-base);
  transition:
    color var(--duration-state) var(--ease-state),
    background-color var(--duration-state) var(--ease-state);
}

.arco-trigger-menu .arco-trigger-menu-item:hover,
.arco-trigger-menu .arco-trigger-menu-pop-header:hover {
  color: var(--color-primary);
  background-color: var(--color-bg-surface);
}

.arco-trigger-menu .arco-trigger-menu-item.arco-trigger-menu-selected,
.arco-trigger-menu .arco-trigger-menu-pop-header.arco-trigger-menu-selected {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  background-color: transparent;
}

.arco-trigger-menu .arco-trigger-menu-item.arco-trigger-menu-selected:hover,
.arco-trigger-menu .arco-trigger-menu-pop-header.arco-trigger-menu-selected:hover {
  background-color: var(--color-bg-surface);
}
</style>
