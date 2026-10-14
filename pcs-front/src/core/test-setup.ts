/**
 * Vitest 全局测试环境补丁。
 *
 * jsdom 未实现 window.matchMedia，Arco 内部响应式 hook（a-drawer/a-modal/a-grid 等）
 * 挂载时会调用它，未打补丁会在所有引用这些组件的单测里抛错。
 *
 * env.ts 在测试环境（MODE==='test'）不走 loadConfig，getRuntime() 返回 {} 走默认值。
 * 如需特定配置测试，在具体测试文件内 vi.mock('@core/config/runtime', ...) 覆盖 getConfig 返回值。
 */

// jsdom 默认 innerWidth=1024 落入 Tablet 区间（768–1279px），
// 响应式壳组件（ByModal/ByDrawer/ByTable）的单测默认假设 Desktop 视口，故此处固定为桌面宽度。
Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 })

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})
