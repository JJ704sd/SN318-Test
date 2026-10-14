/**
 * 组件领域统一入口：@core/components
 *
 * 通用组件一律从这里具名导入（如 `import { ByCard, ByTable } from '@core/components'`），
 * 不开放单个组件的深路径入口（package exports `"./*": null` 拦截）。入口不做全局注册、
 * 不引入全部组件样式——组件 scoped 样式由 vite-plugin-lib-inject-css 构建时随各自模块注入。
 *
 * Arco 组件样式（H-02）：以副作用 import 声明本入口实际依赖的 Arco 组件样式，随入口外置
 * 由消费方打包；业务无需再在入口全局兜底。新增使用 Arco 组件时应在此补对应样式。
 */
import '@arco-design/web-vue/es/button/style/css.js'
import '@arco-design/web-vue/es/tooltip/style/css.js'
import '@arco-design/web-vue/es/drawer/style/css.js'
import '@arco-design/web-vue/es/skeleton/style/css.js'
import '@arco-design/web-vue/es/modal/style/css.js'
import '@arco-design/web-vue/es/table/style/css.js'
import '@arco-design/web-vue/es/pagination/style/css.js'
import '@arco-design/web-vue/es/spin/style/css.js'
import '@arco-design/web-vue/es/form/style/css.js'
import '@arco-design/web-vue/es/input/style/css.js'
import '@arco-design/web-vue/es/upload/style/css.js'
import '@arco-design/web-vue/es/image/style/css.js'
import '@arco-design/web-vue/es/message/style/css.js'
import '@arco-design/web-vue/es/notification/style/css.js'

export * from './base'
export * from './form'
export * from './feedback'

// 组件内部类型显式导出（从组件文件取类型，避免含点号文件名生成非法导出名）
export type { ByTableColumn, CardConfig } from './feedback/ByTable/ByTable.vue'
export type { StatusType } from './base/ByStatusTag/ByStatusTag.vue'
