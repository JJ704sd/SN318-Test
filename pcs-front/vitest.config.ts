import { fileURLToPath, URL } from 'node:url'

import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/**
 * vitest 用 SVG 虚拟模块 stub：`virtual:svg-icons-register` 在单测里解析为空模块。
 * （原 @baiyun/template-core/vite-config 的 coreVitestPlugins 内联）
 */
function svgIconsRegisterStub() {
  return {
    name: 'svg-icons-register-stub',
    resolveId(id: string) {
      if (id === 'virtual:svg-icons-register') return '\0virtual:svg-icons-register'
      return null
    },
    load(id: string) {
      if (id === '\0virtual:svg-icons-register') return 'export default {}'
      return null
    },
  }
}

export default defineConfig({
  plugins: [vue(), svgIconsRegisterStub()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    // 排除根目录下误克隆的嵌套 pcs-front/ 旧仓库副本（未跟踪本地残留，其旧 spec 引用已删除的
    // @baiyun/template-core，不应纳入本仓库测试范围）
    exclude: [...configDefaults.exclude, '**/pcs-front/**'],
    // 核心层全局测试补丁：jsdom matchMedia / innerWidth（src/core 组件单测依赖）
    setupFiles: ['src/core/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/{api,bootstrap,directives,router,utils}/**/*.{ts,vue,js}'],
      thresholds: {
        lines: 80,
      },
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/**/*.spec.ts',
        'src/**/test/**',
        'src/mock/**',
      ],
    },
  },
})
