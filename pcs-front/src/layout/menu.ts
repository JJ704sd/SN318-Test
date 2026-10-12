import type { Component } from 'vue'
import type { AuthPolicy } from '@baiyun/template-core/router'
import { usePermissionStore } from '@baiyun/template-core/stores'
import type { RouteRecordRaw } from 'vue-router'
import { routes } from '@/router/routes'

export interface MenuNode {
  /** 唯一 key，取路由绝对 path，与 selectedKeys 对齐 */
  path: string
  title: string
  /** 菜单图标：路由 meta.icon 透传的图标组件对象，无则不显示图标 */
  icon?: Component
  children?: MenuNode[]
}

/** 拼接父子 path 为绝对路径（child 以 / 开头则直接用，否则拼在父后） */
function joinPath(parent: string, child: string): string {
  if (child.startsWith('/')) return child
  const base = parent.endsWith('/') ? parent.slice(0, -1) : parent
  return `${base}/${child}`
}

/** 从 meta.auth 提取菜单显示用 resourceId；非 resourceId 策略返回 undefined。 */
function extractMenuResourceId(auth: AuthPolicy | undefined): string | undefined {
  if (auth && typeof auth === 'object' && 'resourceId' in auth) {
    return auth.resourceId
  }
  return undefined
}

/** 递归把路由表转为菜单树：过滤 hideInMenu、无权限、无 title 的节点 */
function walk(records: RouteRecordRaw[], parentPath: string): MenuNode[] {
  const nodes: MenuNode[] = []
  const permissionStore = usePermissionStore()

  for (const record of records) {
    const fullPath = joinPath(parentPath, record.path)
    const children = record.children ? walk(record.children, fullPath) : []
    const { title, icon, hideInMenu, auth } = record.meta ?? {}

    if (hideInMenu) continue

    // 权限过滤：菜单显示用 meta.auth.resourceId（与路由准入同码）
    const visibleResourceId = extractMenuResourceId(auth)
    if (visibleResourceId && !permissionStore.can(visibleResourceId)) continue

    // 有 title 的作为菜单项；无 title 但有可见子项的（如布局容器）向上提升其子项
    if (title) {
      nodes.push({ path: fullPath, title, icon, children: children.length ? children : undefined })
    } else if (children.length) {
      nodes.push(...children)
    }
  }
  return nodes
}

/** 由路由表生成侧边菜单树 */
export function buildMenuTree(): MenuNode[] {
  return walk(routes, '')
}

/**
 * 找出 targetPath 在菜单树中的所有祖先 path（仅含有 children 的节点，即 a-sub-menu 的 key）。
 * 用于子菜单选中时展开父级：传入当前路由 path，返回需要 open 的 sub-menu key 列表。
 */
export function findMenuAncestors(menuTree: MenuNode[], targetPath: string): string[] {
  function dfs(nodes: MenuNode[], ancestors: string[]): string[] | null {
    for (const node of nodes) {
      if (node.path === targetPath) return ancestors
      if (node.children?.length) {
        const result = dfs(node.children, [...ancestors, node.path])
        if (result) return result
      }
    }
    return null
  }
  return dfs(menuTree, []) ?? []
}
