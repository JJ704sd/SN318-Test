import { fileURLToPath, URL } from 'node:url'

import { defineConfig, mergeConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'
import { ArcoResolver } from 'unplugin-vue-components/resolvers'
import vueDevTools from 'vite-plugin-vue-devtools'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { coreVitePlugins } from '@baiyun/template-core/vite-config'

// 开发期预构建 Arco 的深层样式入口，避免首次访问懒加载页面时才发现依赖并触发整页 reload。
// 仅作用于 Vite dev dependency optimizer，不改变生产构建的按需分包。
const DEV_OPTIMIZED_ARCO_IMPORTS = [
  '@arco-design/web-vue',
  '@arco-design/web-vue/es/icon',
  '@arco-design/web-vue/es/alert/style/css.js',
  '@arco-design/web-vue/es/anchor/style/css.js',
  '@arco-design/web-vue/es/avatar/style/css.js',
  '@arco-design/web-vue/es/badge/style/css.js',
  '@arco-design/web-vue/es/breadcrumb/style/css.js',
  '@arco-design/web-vue/es/button/style/css.js',
  '@arco-design/web-vue/es/checkbox/style/css.js',
  '@arco-design/web-vue/es/date-picker/style/css.js',
  '@arco-design/web-vue/es/dropdown/style/css.js',
  '@arco-design/web-vue/es/form/style/css.js',
  '@arco-design/web-vue/es/grid/style/css.js',
  '@arco-design/web-vue/es/image/style/css.js',
  '@arco-design/web-vue/es/input-number/style/css.js',
  '@arco-design/web-vue/es/input/style/css.js',
  '@arco-design/web-vue/es/layout/style/css.js',
  '@arco-design/web-vue/es/link/style/css.js',
  '@arco-design/web-vue/es/menu/style/css.js',
  '@arco-design/web-vue/es/message/style/css.js',
  '@arco-design/web-vue/es/modal/style/css.js',
  '@arco-design/web-vue/es/notification/style/css.js',
  '@arco-design/web-vue/es/pagination/style/css.js',
  '@arco-design/web-vue/es/popover/style/css.js',
  '@arco-design/web-vue/es/radio/style/css.js',
  '@arco-design/web-vue/es/select/style/css.js',
  '@arco-design/web-vue/es/skeleton/style/css.js',
  '@arco-design/web-vue/es/space/style/css.js',
  '@arco-design/web-vue/es/spin/style/css.js',
  '@arco-design/web-vue/es/steps/style/css.js',
  '@arco-design/web-vue/es/switch/style/css.js',
  '@arco-design/web-vue/es/table/style/css.js',
  '@arco-design/web-vue/es/tabs/style/css.js',
  '@arco-design/web-vue/es/textarea/style/css.js',
  '@arco-design/web-vue/es/time-picker/style/css.js',
  '@arco-design/web-vue/es/timeline/style/css.js',
  '@arco-design/web-vue/es/tooltip/style/css.js',
  '@arco-design/web-vue/es/upload/style/css.js',
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return mergeConfig(coreVitePlugins, {
    plugins: [
      // Arco 按需：解析模板中 a-*/icon-* 标签，自动 import 组件与组件样式（main.ts 已移除全量注册）
      Components({
        resolvers: [ArcoResolver({ resolveIcons: true })],
        dts: false,
      }),
      vueDevTools(),
      basicSsl(),
    ],
    optimizeDeps: {
      include: DEV_OPTIMIZED_ARCO_IMPORTS,
      // AI 与运行时配置必须共享同一模块实例；若分别预构建，Vite 会把 Core 内部
      // runtime 缓存复制到不同 chunk，导致 AI 一直读取默认的 0ms。
      // 同时让本地 junction Core 的状态机改动无需依赖旧预构建缓存。
      // 三入口（ai/ai-assistant/ai-embedded）一律走源码，不在 include 也不被 auto-optimize。
      exclude: ['@baiyun/template-core/ai', '@baiyun/template-core/ai/assistant', '@baiyun/template-core/ai/embedded'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      preserveSymlinks: true,
      dedupe: ['vue', 'pinia', 'vue-router', '@arco-design/web-vue', 'axios', 'dayjs'],
    },
    server: {
      host: true,
      allowedHosts: true,
      open: 'https://localhost:5173',
      proxy: {
        // dev 期同源：SPA 请求 /api/product-center/v1 转发到本地 Fastify BFF（npm run bff:dev）
        '/api/product-center/v1': {
          target: 'http://127.0.0.1:8180',
          changeOrigin: true,
        },
      },
    },
    define:
      mode === 'production'
        ? {
            'console.log': '(() => {})',
            'console.info': '(() => {})',
            'console.debug': '(() => {})',
          }
        : undefined,
  })
})
