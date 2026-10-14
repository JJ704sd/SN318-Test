import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { device, setDevice, useDevice } from './useDevice'

type Exposed = ReturnType<typeof useDevice>

// module 级单例：本地持有一批挂载实例，afterEach 统一卸载以复位 listenerCount/resizeFrame
const created: Array<ReturnType<typeof mount> | null> = []

function mountDevice(width: number) {
  window.innerWidth = width
  let exposed!: Exposed
  const Comp = defineComponent({
    setup() {
      exposed = useDevice()
      return () => h('div')
    },
  })
  const wrapper = mount(Comp)
  created.push(wrapper)
  return { wrapper, exposed }
}

/** 等待一帧 rAF（resize 合并帧触发的 sync 完成） */
function flushRaf() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

afterEach(() => {
  created.forEach((w) => w?.unmount())
  created.length = 0
})

describe('useDevice', () => {
  it('默认宽度（jsdom 1024）判定为 tablet', () => {
    const { exposed } = mountDevice(1024)
    expect(exposed.device.value).toBe('tablet')
    expect(exposed.isTablet.value).toBe(true)
  })

  it('≤767 判定 mobile', () => {
    const { exposed } = mountDevice(767)
    expect(exposed.device.value).toBe('mobile')
    expect(exposed.isMobile.value).toBe(true)
    expect(exposed.isDesktop.value).toBe(false)
  })

  it('768–1279 判定 tablet', () => {
    const { exposed } = mountDevice(1000)
    expect(exposed.device.value).toBe('tablet')
  })

  it('≥1280 判定 desktop；1280–1439 桌面子档折叠', () => {
    const { exposed } = mountDevice(1300)
    expect(exposed.device.value).toBe('desktop')
    expect(exposed.isDesktop.value).toBe(true)
    expect(exposed.desktopExpanded.value).toBe(false)
  })

  it('≥1440 桌面子档展开', () => {
    const { exposed } = mountDevice(1500)
    expect(exposed.device.value).toBe('desktop')
    expect(exposed.desktopExpanded.value).toBe(true)
  })

  it('窗口 resize 重新判档；同帧多次 resize 合并到最后一帧', async () => {
    const { exposed } = mountDevice(1024)
    expect(exposed.device.value).toBe('tablet')

    window.innerWidth = 600
    window.dispatchEvent(new Event('resize'))
    await flushRaf()
    await vi.waitFor(() => expect(exposed.device.value).toBe('mobile'))

    // 连续两次 resize 只合并到一帧，取最后一次宽度
    window.innerWidth = 500
    window.dispatchEvent(new Event('resize'))
    window.innerWidth = 400
    window.dispatchEvent(new Event('resize'))
    await flushRaf()
    expect(exposed.width.value).toBe(400)
  })

  it('setDevice 手动覆盖档位', () => {
    const { exposed } = mountDevice(1024)
    setDevice('mobile')
    expect(exposed.device.value).toBe('mobile')
    expect(device.value).toBe('mobile')
  })

  it('首个挂载注册 resize 监听；重复挂载不重复注册（listenerCount 非 0 分支）', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const first = mountDevice(1024)
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function))

    const callsAfterFirst = addSpy.mock.calls.length
    mountDevice(1280) // listenerCount 此时为 1，不重复 add
    expect(addSpy.mock.calls.length).toBe(callsAfterFirst)
    first.wrapper.unmount()
  })

  it('卸载后移除 resize 监听并清理动画帧（resizeFrame 为 null 时跳过 cancel）', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const { wrapper } = mountDevice(1024)
    wrapper.unmount()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    // 无挂起帧：resizeFrame===null，不走 cancelAnimationFrame
    expect(cancelSpy).not.toHaveBeenCalled()
  })

  it('卸载时若存在挂起 resize 帧则取消动画帧（resizeFrame 非 null 分支）', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const { wrapper } = mountDevice(1024)
    window.innerWidth = 700
    window.dispatchEvent(new Event('resize')) // 同步置 resizeFrame 并调度 rAF
    wrapper.unmount() // 同步卸载 → resizeFrame!==null → cancel
    expect(cancelSpy).toHaveBeenCalledTimes(1)
  })
})
