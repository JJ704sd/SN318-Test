import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { describe, it, expect, afterEach } from 'vitest'
import {
  Drawer as ADrawer,
  Skeleton as ASkeleton,
  SkeletonLine as ASkeletonLine,
} from '@arco-design/web-vue'
import ByDrawer from './ByDrawer.vue'
import { setDevice } from '@core/composables/useDevice'

const globalComponents = { ADrawer, ASkeleton, ASkeletonLine }

// ADrawer 默认 renderToBody=true，内容经 Teleport 挂到 document.body
async function mountDrawer(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
) {
  const wrapper = mount(ByDrawer, {
    props: { visible: true, title: '标题', ...props },
    global: { components: globalComponents },
    slots,
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, body: new DOMWrapper(document.body) }
}

afterEach(() => {
  setDevice('desktop')
  document.body.innerHTML = ''
})

describe('ByDrawer', () => {
  it('visible 双向绑定', async () => {
    const { wrapper } = await mountDrawer()
    wrapper.findComponent(ADrawer).vm.$emit('update:visible', false)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
  })

  it('点关闭按钮 emit close 与 update:visible', async () => {
    const { wrapper, body } = await mountDrawer()
    await body.find('.by-drawer__close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
  })

  it('footer 插槽有内容才渲染', async () => {
    const { body: bodyNoFooter } = await mountDrawer()
    expect(bodyNoFooter.find('.by-drawer__footer').exists()).toBe(false)

    const { body: bodyWithFooter } = await mountDrawer({}, { footer: '<button>操作</button>' })
    expect(bodyWithFooter.find('.by-drawer__footer').exists()).toBe(true)
  })

  it('loading=true 时显示骨架屏且 header 关闭按钮仍存在', async () => {
    const { body } = await mountDrawer({ loading: true })
    expect(body.find('.arco-skeleton').exists()).toBe(true)
    expect(body.find('.by-drawer__close').exists()).toBe(true)
    expect(body.find('.by-drawer__footer').exists()).toBe(false)
  })

  it('size=default 时宽度取 480', async () => {
    const { wrapper } = await mountDrawer()
    expect(wrapper.findComponent(ADrawer).props('width')).toBe(480)
  })

  it('size=large 时宽度取 640', async () => {
    const { wrapper } = await mountDrawer({ size: 'large' })
    expect(wrapper.findComponent(ADrawer).props('width')).toBe(640)
  })

  it('Mobile 通用抽屉全屏', async () => {
    const { wrapper, body } = await mountDrawer()
    setDevice('mobile')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(ADrawer).props('width')).toBe('100%')
    expect(body.find('.by-drawer--fullscreen').exists()).toBe(true)
  })

  it('bare=true 时不渲染头部且容器挂 bare 类', async () => {
    const { body } = await mountDrawer({ bare: true })
    expect(body.find('.arco-drawer-header').exists()).toBe(false)
    expect(body.find('.by-drawer--bare').exists()).toBe(true)
  })

  it('bare 默认 false 时头部正常渲染', async () => {
    const { body } = await mountDrawer()
    expect(body.find('.arco-drawer-header').exists()).toBe(true)
    expect(body.find('.by-drawer--bare').exists()).toBe(false)
  })

  it('内容区滚动条宽度为 --spacing-xs（4px）', () => {
    const source = readFileSync(resolve(__dirname, './ByDrawer.vue'), 'utf8')
    expect(source).toMatch(
      /arco-drawer-body::-webkit-scrollbar[\s\S]*?width:\s*var\(--spacing-xs\)/,
    )
  })
})
