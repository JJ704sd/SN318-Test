// Stylelint：把设计规范工具化，拦截硬编码色值 / z-index 裸数字 / 非 Token 动效。
// 放行 tokens.css 与 arco-theme.less（Token 与主题定义处，允许原始色值/时长字面量）。

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-recommended-vue'],
  overrides: [
    {
      files: ['**/*.less'],
      customSyntax: 'postcss-less',
    },
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
  rules: {
    // 1) 禁止十六进制颜色字面量，强制走 var(--color-*)
    'color-no-hex': true,

    // 2) 禁止 z-index 裸数字，强制走 var(--z-*)
    'declaration-property-value-disallowed-list': {
      'z-index': [/^-?\d+$/],
      // 3) 动效 Token 化：transition/animation 禁裸时长与非 Token 缓动
      //    - 拦截未包裹在 var() 里的时间单位（如 200ms / 0.3s）
      //    - 拦截 ease / ease-in / ease-out / ease-in-out / cubic-bezier（状态过渡须 linear 或 var(--ease-state)）
      //    ease 正则加 (?<!-) 负向后行：只拦裸关键字 ease，放行 var(--ease-state) 里的 "ease" 子串
      transition: [/\d+m?s/, /(?<!-)\bease(-in|-out|-in-out)?\b/, /cubic-bezier/],
      'transition-duration': [/\d+m?s/],
      'transition-timing-function': [/(?<!-)\bease(-in|-out|-in-out)?\b/, /cubic-bezier/],
      animation: [/\d+m?s/, /(?<!-)\bease(-in|-out|-in-out)?\b/, /cubic-bezier/],
      'animation-duration': [/\d+m?s/],
      'animation-timing-function': [/(?<!-)\bease(-in|-out|-in-out)?\b/, /cubic-bezier/],
    },

    // 关闭与本项目约定冲突或过严的 standard 规则
    'custom-property-pattern': null,
    'selector-class-pattern': null,
    'value-keyword-case': null,
    'no-empty-source': null,
    'declaration-empty-line-before': null,
  },
  ignoreFiles: [
    '**/dist/**',
    '**/coverage/**',
    // Token 与主题定义处：允许原始色值与动效时长 Token 定义
    'src/styles/tokens.css',
    'src/styles/arco-theme.less',
    // Vue 脚手架自带演示样式（含调色板与欢迎页布局），阶段 1 由 src/styles/ 下
    // tokens.css / reset.css 替换，非模板真实样式，暂放行以免为 throwaway 代码做无意义修复
    'src/assets/base.css',
    'src/assets/main.css',
  ],
}
