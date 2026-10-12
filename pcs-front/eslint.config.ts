import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    // 纯 JSON 配置文件（.js 扩展名是部署约定，内容为 JSON 供 fetch + .json() 解析）
    'config.example.js',
    'public/config.js',
    'deploy/config.*.js',
  ]),

  ...pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,

  {
    name: 'app/no-deep-imports',
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@baiyun/template-core/dist/*', '@baiyun/template-core/src/*'],
              message: '请从包顶层 @baiyun/template-core import，不要使用内部路径。',
            },
          ],
        },
      ],
    },
  },

  {
    name: 'app/no-unused-vars',
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // TS 可选 prop（`title?: string`）已表达「可不传」语义，
      // 运行时 undefined 合理；此规则更适合 JS 项目，TS 项目关闭
      'vue/require-default-prop': 'off',
      // v-model 的 modelValue 必填但设默认值是合理模式；此规则强制改可选会破坏 v-model 约定
      'vue/no-required-prop-with-default': 'off',
    },
  },
)
