import type { Directive, DirectiveBinding } from 'vue'
import { watch } from 'vue'
import { usePermissionStore } from '@baiyun/template-core/stores'
import './permission.css'

/**
 * 权限控显隐：无权限时隐藏元素（切换 .is-hidden），权限加载完成 / profile 刷新后自动重算。
 *
 * 相比原 removeChild 移除：用 display:none 隐藏但保留 DOM，权限码晚到或 TTL 到期重拉权限时，
 * 已隐藏的元素能恢复显示；配合 updated 钩子响应 binding.value 变化。
 *
 * 用法：
 * ```vue
 * <a-button v-permission="'operation:template.demo.export'">导出</a-button>
 * ```
 */

/** 元素 -> 当前权限码读取器。watch 回调不闭包 binding（mounted 时的 binding.value 是静态快照），改为每次实时读取。 */
const codeReaders = new WeakMap<HTMLElement, () => string | string[] | undefined>()

/** 元素 -> 权限变化 watch 的停止函数（unmounted 清理，避免泄漏）。 */
const watchers = new WeakMap<HTMLElement, () => void>()

function apply(el: HTMLElement): void {
  const codes = codeReaders.get(el)?.()
  const store = usePermissionStore()
  // can() / canAny() 对空值放行：单码 undefined 或数组空均不隐藏
  const allowed = Array.isArray(codes) ? store.canAny(codes) : store.can(codes)
  el.classList.toggle('is-hidden', !allowed)
}

function watchPermissions(el: HTMLElement): void {
  const stop = watch(
    // loaded 变化（首次拉取完成）+ resourceIds 变化（TTL 刷新 / 登录态切换）时重算
    () => [usePermissionStore().loaded, usePermissionStore().resourceIds],
    () => apply(el),
  )
  watchers.set(el, stop)
}

function syncBinding(el: HTMLElement, binding: DirectiveBinding<string | string[] | undefined>): void {
  codeReaders.set(el, () => binding.value)
  apply(el)
}

function stopWatching(el: HTMLElement): void {
  watchers.get(el)?.()
  watchers.delete(el)
  codeReaders.delete(el)
}

/** v-permission 权限控显隐：无权限时隐藏元素，权限加载完成 / profile 刷新后自动重算。
 * 支持字符串或字符串数组；数组语义为「任一权限满足」即显示，全部不满足则隐藏。
 * 用法：
 * ```vue
 * <a-button v-permission="'operation:template.demo.export'">导出</a-button>
 * <a-dropdown v-permission="['code1', 'code2']">批量操作</a-dropdown>
 * ```
 */
export const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding) {
    syncBinding(el, binding)
    watchPermissions(el)
  },
  updated(el: HTMLElement, binding) {
    syncBinding(el, binding)
  },
  unmounted(el: HTMLElement) {
    stopWatching(el)
  },
}
