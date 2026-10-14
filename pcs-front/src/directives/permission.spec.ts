import { nextTick, reactive, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { permissionDirective } from './permission'

const mocks = vi.hoisted(() => ({
  usePermissionStore: vi.fn<() => PermissionStoreMock>(),
}))

interface PermissionStoreMock {
  loaded: { value: boolean }
  resourceIds: { value: string[] }
  can: ReturnType<typeof vi.fn>
  canAny: ReturnType<typeof vi.fn>
}

vi.mock('@core/stores', () => ({
  usePermissionStore: mocks.usePermissionStore,
}))

function makeStore({ allow = true, allowAny = true } = {}) {
  return {
    loaded: ref(true),
    resourceIds: ref<string[]>([]),
    can: vi.fn<(code?: string) => boolean>((code?: string) =>
      code == null || code === '' ? true : allow,
    ),
    canAny: vi.fn<(codes: string[]) => boolean>((codes: string[]) =>
      Array.isArray(codes) && codes.length > 0 ? allowAny : true,
    ),
  }
}

/** 构造指令绑定对象并驱动 lifecycle（等同 Vue 对元素应用 v-permission） */
type DirectiveLifecycle = {
  mounted: (el: HTMLElement, binding: { value?: string | string[] }) => void
  updated: (el: HTMLElement, binding: { value?: string | string[] }) => void
  unmounted: (el: HTMLElement) => void
}
const directive = permissionDirective as unknown as DirectiveLifecycle

function bind(el: HTMLElement, value: string | string[] | undefined) {
  directive.mounted(el, { value })
}

function rebind(el: HTMLElement, value: string | string[] | undefined) {
  directive.updated(el, { value })
}

function unbind(el: HTMLElement) {
  directive.unmounted(el)
}

describe('v-permission（字符串与数组，数组=任一满足）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('字符串权限码：有权限时不隐藏，无权限时挂 .is-hidden', () => {
    const store = makeStore({ allow: true })
    mocks.usePermissionStore.mockReturnValue(store)

    const el = document.createElement('button')
    bind(el, 'operation:demo.export')
    expect(store.can).toHaveBeenCalledWith('operation:demo.export')
    expect(el.classList.contains('is-hidden')).toBe(false)

    const storeDenied = makeStore({ allow: false })
    mocks.usePermissionStore.mockReturnValue(storeDenied)
    const denied = document.createElement('button')
    bind(denied, 'operation:demo.export')
    expect(denied.classList.contains('is-hidden')).toBe(true)
  })

  it('字符串数组：走 canAny（任一满足即显示），全不满足则隐藏', () => {
    const allowed = makeStore({ allowAny: true })
    mocks.usePermissionStore.mockReturnValue(allowed)
    const el = document.createElement('button')
    bind(el, ['code-a', 'code-b'])
    expect(allowed.canAny).toHaveBeenCalledWith(['code-a', 'code-b'])
    expect(el.classList.contains('is-hidden')).toBe(false)

    const denied = makeStore({ allowAny: false })
    mocks.usePermissionStore.mockReturnValue(denied)
    const el2 = document.createElement('button')
    bind(el2, ['code-a', 'code-b'])
    expect(el2.classList.contains('is-hidden')).toBe(true)
  })

  it('updated 随绑定值变化重算', () => {
    const store = makeStore({ allowAny: false })
    mocks.usePermissionStore.mockReturnValue(store)
    const el = document.createElement('button')
    bind(el, ['code-a'])
    expect(el.classList.contains('is-hidden')).toBe(true)

    // 值从数组换成字符串：改走 can，且新值传入
    store.can.mockImplementation((code?: string) => code === 'granted')
    rebind(el, 'granted')
    expect(store.can).toHaveBeenCalledWith('granted')
    expect(el.classList.contains('is-hidden')).toBe(false)
  })

  it('空值放行且 unmounted 清理 watcher 不抛错', () => {
    const store = makeStore({ allow: false })
    mocks.usePermissionStore.mockReturnValue(store)
    const el = document.createElement('div')
    bind(el, undefined)
    // 空值（undefined/空串）视为放行，不被隐藏
    expect(el.classList.contains('is-hidden')).toBe(false)
    expect(() => unbind(el)).not.toThrow()
  })

  it('权限画像加载完成/刷新（resourceIds 变化）后 watch 自动重算显隐', async () => {
    // 生产 Pinia store 是响应式对象（属性自动解包），须用 reactive 对齐，ref 无法被 watch getter 追踪
    const can = vi.fn<(code?: string) => boolean>(() => false)
    const canAny = vi.fn<(codes: string[]) => boolean>(() => false)
    const store = reactive({
      loaded: true,
      resourceIds: [] as string[],
      can,
      canAny,
    })
    mocks.usePermissionStore.mockReturnValue(store as unknown as PermissionStoreMock)
    const el = document.createElement('button')
    bind(el, 'granted')
    expect(el.classList.contains('is-hidden')).toBe(true)

    // 权限画像刷新：放行 granted，且 resourceIds 变化触发 watch 源 → 回调重算
    can.mockImplementation((code?: string) => code === 'granted')
    store.resourceIds = ['granted']
    await nextTick()
    expect(can).toHaveBeenLastCalledWith('granted')
    expect(el.classList.contains('is-hidden')).toBe(false)
  })
})
