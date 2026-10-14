import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { describe, it, expect, afterEach } from 'vitest'
import { Modal as AModal, Button as AButton } from '@arco-design/web-vue'
import ByModal from './ByModal.vue'
import { setDevice } from '@core/composables/useDevice'

const globalComponents = { AModal, AButton }

async function mountModal(props: Record<string, unknown> = {}) {
  const wrapper = mount(ByModal, {
    props: { visible: true, title: '标题', ...props },
    global: { components: globalComponents },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, body: new DOMWrapper(document.body) }
}

afterEach(() => {
  setDevice('desktop')
  document.body.innerHTML = ''
})

describe('ByModal', () => {
  it('visible 双向绑定', async () => {
    const { wrapper } = await mountModal()
    const modal = wrapper.findComponent(AModal)
    modal.vm.$emit('update:visible', false)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
  })

  it('点确认 emit confirm', async () => {
    const { wrapper } = await mountModal()
    const buttons = wrapper.findAllComponents(AButton)
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('confirmLoading 时确认按钮 loading', async () => {
    const { wrapper } = await mountModal({ confirmLoading: true })
    const buttons = wrapper.findAllComponents(AButton)
    expect(buttons.length).toBeGreaterThanOrEqual(2)
    expect(buttons[1]!.props('loading')).toBe(true)
  })

  it('confirmLoading=true 时强制 mask-closable=false', async () => {
    const { wrapper } = await mountModal({ confirmLoading: true, maskClosable: true })
    expect(wrapper.findComponent(AModal).props('maskClosable')).toBe(false)
  })

  it('confirmLoading=true 时 esc-to-close=false，且关闭按钮隐藏', async () => {
    const { wrapper, body } = await mountModal({ confirmLoading: true })
    const modal = wrapper.findComponent(AModal)
    expect(modal.props('escToClose')).toBe(false)
    expect(modal.props('closable')).toBe(false)
    expect(body.find('.by-modal__close').exists()).toBe(false)
  })

  it('点自定义关闭按钮 emit cancel', async () => {
    const { wrapper, body } = await mountModal()
    await body.find('.by-modal__close').trigger('click')
    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
  })

  it('mode=form-double 时宽度取 640', async () => {
    const { wrapper } = await mountModal({ mode: 'form-double' })
    expect(wrapper.findComponent(AModal).props('width')).toBe(640)
  })

  it('size=large 时宽度取 640（不依赖 form-double）', async () => {
    const { wrapper } = await mountModal({ mode: 'confirm', size: 'large' })
    expect(wrapper.findComponent(AModal).props('width')).toBe(640)
  })

  it('mode=confirm 默认宽度取 480', async () => {
    const { wrapper } = await mountModal()
    expect(wrapper.findComponent(AModal).props('width')).toBe(480)
  })

  it('Mobile 默认弹框为底部 Sheet', async () => {
    const { wrapper, body } = await mountModal()
    setDevice('mobile')
    await wrapper.vm.$nextTick()
    const modal = wrapper.findComponent(AModal)
    expect(modal.props('width')).toBe('100%')
    expect(modal.props('alignCenter')).toBe(false)
    expect(body.find('.by-modal--sheet').exists()).toBe(true)
    expect(body.find('.by-modal--fullscreen').exists()).toBe(false)
  })

  it('Mobile 大弹窗全屏', async () => {
    const { wrapper, body } = await mountModal({ size: 'large' })
    setDevice('mobile')
    await wrapper.vm.$nextTick()
    const modal = wrapper.findComponent(AModal)
    expect(modal.props('width')).toBe('100%')
    expect(modal.props('alignCenter')).toBe(true)
    expect(body.find('.by-modal--fullscreen').exists()).toBe(true)
    expect(body.find('.by-modal--sheet').exists()).toBe(false)
  })

  it('标题左对齐 title-align=start', async () => {
    const { wrapper } = await mountModal()
    expect(wrapper.findComponent(AModal).props('titleAlign')).toBe('start')
  })

  it('danger 时确认按钮 status=danger', async () => {
    const { wrapper } = await mountModal({ danger: true })
    const buttons = wrapper.findAllComponents(AButton)
    expect(buttons[1]!.props('status')).toBe('danger')
  })
})
