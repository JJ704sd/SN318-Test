import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BasicLayout from './BasicLayout.vue'
import basicLayoutSource from './BasicLayout.vue?raw'
import {
  resetRouteNavigationLoading,
  startRouteNavigationLoading,
} from './composables/useRouteNavigationLoading'

const mocks = vi.hoisted(() => ({
  useSiderStore: vi.fn<() => unknown>(),
  useDevice: vi.fn<() => unknown>(),
}))

vi.mock('@baiyun/template-core/stores', () => ({
  useSiderStore: mocks.useSiderStore,
}))

vi.mock('@baiyun/template-core/composables', () => ({
  useDevice: mocks.useDevice,
}))
vi.mock('@baiyun/template-core/components', () => ({
  ByDrawer: { template: '<div />' },
}))

const stubs = {
  ALayout: { template: '<div><slot /></div>' },
  ALayoutHeader: { template: '<header><slot /></header>' },
  ALayoutSider: { template: '<aside><slot /></aside>' },
  ALayoutContent: { template: '<main><slot /></main>' },
  'a-skeleton': { template: '<div><slot /></div>' },
  'a-skeleton-line': { template: '<span />' },
  RouterView: { template: '<div data-test="router-view" />' },
  AppHeader: { template: '<div data-test="app-header" />' },
  AppSider: { template: '<div data-test="app-sider" />' },
  AppSiderSkeleton: { template: '<div class="basic-layout__sider-skeleton" />' },
}

describe('BasicLayout navigation skeleton', () => {
  beforeEach(() => {
    mocks.useSiderStore.mockReturnValue({
      siderCollapsed: ref(false),
      siderDrawerVisible: ref(false),
      setSiderCollapsed: vi.fn<(collapsed: boolean) => void>(),
      closeSiderDrawer: vi.fn<() => void>(),
    })
    mocks.useDevice.mockReturnValue({
      isDesktop: ref(true),
      desktopExpanded: ref(true),
    })
    resetRouteNavigationLoading()
  })

  afterEach(() => {
    resetRouteNavigationLoading()
    vi.clearAllMocks()
  })

  it('首次导航初始化时，侧栏和内容区均使用骨架替换实际内容', async () => {
    const wrapper = shallowMount(BasicLayout, { global: { stubs } })
    await wrapper.vm.$nextTick()

    startRouteNavigationLoading('/demo/dashboard')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.basic-layout__sider-skeleton').exists()).toBe(true)
    expect(wrapper.find('.basic-layout__content-skeleton').exists()).toBe(true)
    expect(wrapper.find('[data-test="app-sider"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('内容骨架使用白色卡片背景令牌', () => {
    const styles = basicLayoutSource.match(
      /\.basic-layout__content-skeleton\s*\{(?<rules>[\s\S]*?)\n\}/,
    )?.groups?.rules

    expect(styles).toContain('background-color: var(--color-bg-card);')
  })

  it('运小星头像右上角默认显示数字未读角标', () => {
    expect(basicLayoutSource).toMatch(
      /<component\s+:is="assistant\?\.trigger"\s+v-if="assistant"\s+:unread-count="1"\s*\/>/,
    )
  })
})
