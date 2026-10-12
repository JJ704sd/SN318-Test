import { fileURLToPath, URL } from 'node:url'

import { defineConfig, mergeConfig } from 'vitest/config'
import { coreVitestPlugins, coreVitestConfig } from '@baiyun/template-core/vite-config'

export default mergeConfig(
  defineConfig({
    ...coreVitestPlugins,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }),
  mergeConfig(
    coreVitestConfig,
    defineConfig({
      test: {
        environment: 'jsdom',
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
    }),
  ),
)
