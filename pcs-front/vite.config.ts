import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'
import { ArcoResolver } from 'unplugin-vue-components/resolvers'
import vueDevTools from 'vite-plugin-vue-devtools'
import vue from '@vitejs/plugin-vue'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

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
  return {
    // 子路径部署（提测 https://localhost/pcs/）通过 VITE_BASE 注入，如 VITE_BASE=/pcs/；
    // 影响构建产物资源引用与路由 base（createWebHistory(import.meta.env.BASE_URL)），dev 不受影响
    base: process.env.VITE_BASE || '/',
    plugins: [
      vue(),
      // SVG 雪碧图：核心层 SvgIcon 的图标源目录（原 @baiyun/template-core/vite-config 内联）
      createSvgIconsPlugin({
        iconDirs: [fileURLToPath(new URL('./src/core/assets/icons', import.meta.url))],
        symbolId: 'icon-[name]',
      }),
      // Arco 按需：解析模板中 a-*/icon-* 标签，自动 import 组件与组件样式（main.ts 已移除全量注册）
      Components({
        resolvers: [ArcoResolver({ resolveIcons: true })],
        dts: false,
      }),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
      },
      // @baiyun/auth-center-* 仍为 file: 软链依赖，preserveSymlinks 保证模块实例与产物路径稳定
      preserveSymlinks: true,
      dedupe: ['vue', 'pinia', 'vue-router', '@arco-design/web-vue', 'axios', 'dayjs'],
    },
    optimizeDeps: {
      include: DEV_OPTIMIZED_ARCO_IMPORTS,
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      allowedHosts: ['127.0.0.1', 'localhost'],
      open: 'http://127.0.0.1:5173',
      proxy: {
        // dev 期同源：SPA 请求 /pcs/* 转发到本地 Fastify BFF（npm run bff:dev）
        '/pcs/auth': {
          target: 'http://127.0.0.1:8180',
          changeOrigin: true,
        },
        '/pcs/api/lmd/v1': {
          target: 'http://127.0.0.1:8180',
          changeOrigin: true,
        },
        '/pcs/api/pcs/v1': {
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
  }
})
