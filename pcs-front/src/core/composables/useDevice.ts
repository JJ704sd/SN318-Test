import { computed, onMounted, onUnmounted, ref } from 'vue'

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

const MOBILE_MAX = 767
const TABLET_MAX = 1279
// 桌面子档分界（规范 §4.5）：≥1440 侧栏常驻展开 220；1280–1439 常驻折叠 56
const DESKTOP_EXPANDED_MIN = 1440
function resolveDevice(width: number): DeviceType {
  if (width <= MOBILE_MAX) return 'mobile'
  if (width <= TABLET_MAX) return 'tablet'
  return 'desktop'
}

// 模块级单例：多组件调用 useDevice 共享同一状态与唯一 resize 监听（引用计数管理，防重复监听/泄漏）。
const initialWidth = typeof window === 'undefined' ? DESKTOP_EXPANDED_MIN : window.innerWidth
const width = ref(initialWidth)
export const device = ref<DeviceType>(resolveDevice(initialWidth))
let listenerCount = 0
let resizeFrame: number | null = null

/** 手动覆盖设备档位（默认由窗口宽度自动判档，手动覆盖仅用于特殊场景）。 */
export function setDevice(next: DeviceType): void {
  device.value = next
}

function sync() {
  width.value = window.innerWidth
  device.value = resolveDevice(width.value)
}

function onResize() {
  // 合并同一帧内的高频 resize，断点跨越时无需等待防抖延迟。
  if (resizeFrame !== null) return
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null
    sync()
  })
}

/**
 * 三端断点判定（规范 §4.5）：Mobile ≤767 / Tablet 768–1279 / Desktop ≥1280。
 * 设备档位由本 composable 自持（不再写入任何 store），并额外暴露桌面子档 desktopExpanded
 * （≥1440 展开 vs 1280–1439 折叠）供侧栏用。resize 按帧合并 + 引用计数清理监听。
 * 建议在 BasicLayout 挂载时调用以驱动全局；其余组件调用共享同一监听。
 */
export function useDevice() {
  onMounted(() => {
    if (listenerCount === 0) window.addEventListener('resize', onResize)
    listenerCount += 1
    sync()
  })

  onUnmounted(() => {
    listenerCount -= 1
    if (listenerCount === 0) {
      window.removeEventListener('resize', onResize)
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame)
      resizeFrame = null
    }
  })

  const isDesktop = computed(() => device.value === 'desktop')
  const isTablet = computed(() => device.value === 'tablet')
  const isMobile = computed(() => device.value === 'mobile')
  // 桌面子档：仅 desktop 且 ≥1440 为展开，1280–1439 为折叠
  const desktopExpanded = computed(() => isDesktop.value && width.value >= DESKTOP_EXPANDED_MIN)

  return { device, width, isDesktop, isTablet, isMobile, desktopExpanded }
}
