/**
 * Utils 领域入口：@core/utils
 *
 * 格式化与无副作用工具。CSRF cookie 读写属会话安全，归 /auth 域，不在此导出。
 */
import { EMPTY_TEXT } from './constants'
export * from './format'
export * from './valueFormat'
export { EMPTY_TEXT }
